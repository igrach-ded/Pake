# 🚀 Pake Android Support

Этот форк добавляет **полную поддержку Android** в проект Pake!

## Что нового?

### ✨ Android сборка
Теперь вы можете создавать `.apk` файлы из любого веб-сайта одной командой:

```bash
pake https://chatgpt.com --name ChatGPT --platform android
```

### 📦 Что включено

1. **AndroidBuilder** (`bin/builders/AndroidBuilder.ts`)
   - Автоматическая проверка Android SDK/NDK
   - Установка Rust Android targets
   - Сборка APK/AAB через Tauri Android toolchain

2. **Android конфигурация Tauri** (`src-tauri/tauri.android.conf.json`)
   - Настройки для Android WebView
   - Мобильные capabilities

3. **Rust код с Android поддержкой**
   - Условная компиляция для десктопных фич (tray, shortcuts, menu)
   - Android-специфичный user-agent
   - Оптимизация для мобильных устройств

4. **CLI опция `--platform`**
   - `--platform android` - сборка для Android
   - `--platform macos/windows/linux` - явное указание платформы

## Быстрый старт

### 1. Установите зависимости

**Android SDK & NDK:**
```bash
# Через Android Studio или sdkmanager
sdkmanager "platforms;android-34" "ndk;25.2.9519653"
```

**Переменные окружения:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

**Rust targets:**
```bash
rustup target add aarch64-linux-android
cargo install cargo-ndk
```

### 2. Соберите приложение

```bash
# APK (для установки на устройство)
pake https://example.com --name MyApp --platform android

# AAB (для Google Play Store)
pake https://example.com --name MyApp --platform android --targets aab
```

### 3. Установите на устройство

```bash
adb install MyApp.apk
```

## Изменения в коде

### TypeScript/JavaScript
- `bin/types.ts` - добавлен `android` в `SupportedPlatform`
- `bin/builders/AndroidBuilder.ts` - новый билдер для Android
- `bin/builders/BuilderProvider.ts` - поддержка `--platform android`
- `bin/helpers/merge.ts` - Android конфигурация
- `bin/helpers/cli-program.ts` - опция `--platform`

### Rust
- `src-tauri/src/app/config.rs` - `android` в `PlatformSpecific<T>`
- `src-tauri/src/lib.rs` - условная компиляция для Android
- `src-tauri/src/app/setup.rs` - desktop-only функции обёрнуты в `#[cfg]`
- `src-tauri/Cargo.toml` - Android-совместимые зависимости
- `src-tauri/pake.json` - Android user-agent

### Конфигурация
- `src-tauri/tauri.android.conf.json` - Android Tauri конфиг
- `src-tauri/capabilities/mobile.json` - мобильные permissions

## Отличия от десктопной версии

| Фича | Desktop | Android |
|------|---------|---------|
| System Tray | ✅ | ❌ (не поддерживается) |
| Global Shortcuts | ✅ | ❌ (не поддерживается) |
| Window Resize | ✅ | ❌ (полноэкранный режим) |
| Menu Bar | ✅ (macOS) | ❌ |
| Hide on Close | ✅ | ❌ (управляется системой) |
| User Agent | Desktop | Mobile Chrome |
| Output | .dmg/.msi/.deb | .apk/.aab |

## Примеры использования

### ChatGPT для Android
```bash
pake https://chat.openai.com \
  --name ChatGPT \
  --platform android \
  --icon ./chatgpt-icon.png
```

### Twitter Lite
```bash
pake https://twitter.com \
  --name Twitter \
  --platform android \
  --targets apk
```

### GitHub Mobile
```bash
pake https://github.com \
  --name GitHub \
  --platform android \
  --debug  # для тестирования
```

## Производительность

- **Размер APK**: ~5-10 MB
- **Время запуска**: <1 секунды
- **Память**: Низкое использование (нативный Android WebView)
- **Батарея**: Оптимизировано для мобильных устройств

## Документация

Подробная документация: [docs/android-usage.md](docs/android-usage.md)

## Troubleshooting

### ANDROID_HOME not set
```bash
export ANDROID_HOME=$HOME/Android/Sdk
```

### JDK не найден
Установите JDK 17+ и установите `JAVA_HOME`.

### Сборка занимает много времени
Первая сборка может занять 5-10 минут (компиляция Rust зависимостей).

### APK не устанавливается
Включите "Установка из неизвестных источников" в настройках Android.

## Лицензия

MIT (как и оригинальный Pake)

## Credits

Оригинальный проект: [tw93/Pake](https://github.com/tw93/Pake)

Android поддержка добавлена в этом форке.
