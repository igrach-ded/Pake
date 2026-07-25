import BaseBuilder from './BaseBuilder';
import MacBuilder from './MacBuilder';
import WinBuilder from './WinBuilder';
import LinuxBuilder from './LinuxBuilder';
import AndroidBuilder from './AndroidBuilder';
import { PakeAppOptions } from '@/types';

const { platform } = process;

const buildersMap: Record<
  string,
  new (options: PakeAppOptions) => BaseBuilder
> = {
  darwin: MacBuilder,
  win32: WinBuilder,
  linux: LinuxBuilder,
};

/**
 * Maps --platform CLI values to the same builder classes.
 * "android" always routes to AndroidBuilder regardless of host OS,
 * because cross-compiling Android works on any host.
 */
const platformAliasMap: Record<string, string> = {
  macos: 'darwin',
  windows: 'win32',
  linux: 'linux',
  android: 'android',
};

export default class BuilderProvider {
  static create(options: PakeAppOptions): BaseBuilder {
    const requested = (options.platform || '').toLowerCase();

    // Android is a special case: it works on any host OS
    if (requested === 'android') {
      return new AndroidBuilder(options);
    }

    const hostPlatform = platformAliasMap[requested] || platform;
    const Builder = buildersMap[hostPlatform];
    if (!Builder) {
      throw new Error(
        `The current system "${hostPlatform}" is not supported!`,
      );
    }
    return new Builder(options);
  }
}
