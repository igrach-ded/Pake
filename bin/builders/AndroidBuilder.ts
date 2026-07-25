import path from 'path';
import fsExtra from 'fs-extra';
import chalk from 'chalk';

import { PakeAppOptions } from '@/types';
import { npmDirectory } from '@/utils/dir';
import { getSpinner } from '@/utils/info';
import { shellExec } from '@/utils/shell';
import {
  detectPackageManager,
  getBuildEnvironment,
  getBuildTimeout,
} from './env';
import logger from '@/options/logger';
import BaseBuilder from './BaseBuilder';

/**
 * AndroidBuilder produces a signed .apk (or .aab) using Tauri's
 * built-in Android toolchain (`tauri android build`).
 *
 * Prerequisites (checked in `prepare`):
 *  - Android SDK / NDK installed
 *  - `cargo ndk` installed (rustup target add aarch64-linux-android, etc.)
 *  - JAVA_HOME pointing to JDK 17+
 */
export default class AndroidBuilder extends BaseBuilder {
  constructor(options: PakeAppOptions) {
    super(options);

    // Normalise target: apk (default) or aab (Play Store).
    const validTargets = ['apk', 'aab'];
    this.options.targets = validTargets.includes(options.targets)
      ? options.targets
      : 'apk';
  }

  /**
   * Extends base `prepare` with Android-specific dependency checks.
   */
  async prepare() {
    // 1. Check Android SDK
    const androidHome =
      process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (!androidHome) {
      logger.error(
        '✕ ANDROID_HOME / ANDROID_SDK_ROOT environment variable is not set.',
      );
      logger.warn(
        '✼ Install Android SDK via Android Studio or sdkmanager, then export ANDROID_HOME.',
      );
      logger.warn(
        '✼ See https://tauri.app/start/prerequisites/ (Android tab).',
      );
      process.exit(1);
    }

    // 2. Check JAVA_HOME
    if (!process.env.JAVA_HOME) {
      logger.warn(
        '✼ JAVA_HOME is not set. Tauri Android build requires JDK 17+.',
      );
      logger.warn(
        '✼ Set JAVA_HOME to your JDK installation path (e.g. /usr/lib/jvm/java-17-openjdk).',
      );
    }

    // 3. Check rust Android targets
    const requiredTargets = ['aarch64-linux-android'];
    logger.info(
      `✺ Checking Android Rust targets: ${requiredTargets.join(', ')}...`,
    );

    // 4. Install cargo-ndk if missing
    try {
      await shellExec('cargo ndk --version', 10_000);
    } catch {
      logger.warn('✼ cargo-ndk not found, installing...');
      await shellExec('cargo install cargo-ndk', 120_000);
    }

    // Add Android targets
    for (const target of requiredTargets) {
      try {
        await shellExec(
          `rustup target list --installed | grep -q ${target}`,
          10_000,
        );
      } catch {
        logger.info(`✺ Installing Rust target: ${target}`);
        await shellExec(`rustup target add ${target}`, 60_000);
      }
    }

    // Run base prepare (installs npm deps)
    await super.prepare();
  }

  /**
   * Overrides default build to use `tauri android build` instead of
   * `tauri build`.
   */
  async build(url: string) {
    const { name = 'pake-app' } = this.options;
    const packageManager = await detectPackageManager();

    // Merge configs (same as desktop, but AndroidBuilder writes android conf)
    const { mergeConfig } = await import('@/helpers/merge');
    const tauriConfModule = await import('@/helpers/tauriConfig');
    const tauriConf = tauriConfModule.default;
    await mergeConfig(url, this.options, tauriConf);

    // Config path — same as desktop builders, use .pake/ directory
    const configPath = path.join(
      npmDirectory,
      'src-tauri',
      '.pake',
      'tauri.conf.json',
    );

    // Ensure Tauri Android project is initialised
    const tauriAndroidDir = path.join(
      npmDirectory,
      'src-tauri',
      'gen',
      'android',
    );
    if (!(await fsExtra.pathExists(tauriAndroidDir))) {
      logger.info('✺ Initialising Tauri Android project...');
      const argSep = packageManager === 'npm' ? ' --' : '';
      const initCmd = `cd "${npmDirectory}" && ${packageManager} run tauri${argSep} android init --config "${configPath}"`;
      await shellExec(initCmd, getBuildTimeout());
    }

    // Build the APK/AAB
    const buildSpinner = getSpinner('Building Android app...');
    await new Promise((resolve) => setTimeout(resolve, 500));
    buildSpinner.stop();
    logger.warn('✸ Building Android app (this may take 5-10 minutes)...');

    const buildEnv = getBuildEnvironment();
    const buildTimeout = getBuildTimeout();

    const isAab = this.options.targets === 'aab';
    const argSeparator = packageManager === 'npm' ? ' --' : '';
    const targetFlag = isAab ? ' --target aarch64' : '';
    const bundleFlag = isAab ? ' --aab' : '';
    const debugFlag = this.options.debug ? ' --debug' : '';
    const verboseFlag = this.options.debug ? ' --verbose' : '';

    const buildCommand = `cd "${npmDirectory}" && ${packageManager} run tauri${argSeparator} android build${targetFlag}${bundleFlag}${debugFlag}${verboseFlag} --config "${configPath}"`;

    try {
      await shellExec(buildCommand, buildTimeout, buildEnv);
    } catch (error) {
      logger.error('✕ Android build failed.');
      logger.warn(
        '✼ Make sure ANDROID_HOME, JAVA_HOME, and NDK_HOME are set correctly.',
      );
      throw error;
    }

    // Locate the built APK/AAB and copy to cwd
    const basePath = this.options.debug ? 'debug' : 'release';
    const ext = isAab ? 'aab' : 'apk';
    const bundleSubDir = isAab ? 'bundle' : 'apk';

    const sourcePath = path.join(
      npmDirectory,
      'src-tauri',
      'gen',
      'android',
      'app',
      'build',
      'outputs',
      bundleSubDir,
      this.options.debug ? 'debug' : 'release',
    );

    // Find the APK/AAB file
    let builtFile: string | null = null;
    if (await fsExtra.pathExists(sourcePath)) {
      const files = await fsExtra.readdir(sourcePath);
      builtFile = files.find((f) => f.endsWith(`.${ext}`)) || null;
    }

    if (builtFile) {
      const srcFile = path.join(sourcePath, builtFile);
      const distFile = path.resolve(`${name}.${ext}`);
      await fsExtra.copy(srcFile, distFile);
      logger.success('✔ Build success!');
      logger.success(`✔ Android app located in ${chalk.cyan(distFile)}`);
    } else {
      logger.warn(
        `✼ Could not locate built ${ext.toUpperCase()} in ${sourcePath}`,
      );
      logger.warn(
        `✼ Check ${chalk.cyan('src-tauri/gen/android/app/build/outputs/')} manually.`,
      );
    }
  }

  /**
   * Override to satisfy abstract method; not used since we override `build`.
   */
  getFileName(): string {
    return this.options.name || 'pake-app';
  }

  protected getFileType(_target: string): string {
    return this.options.targets === 'aab' ? 'aab' : 'apk';
  }
}
