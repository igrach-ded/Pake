# 📱 Building Android Apps with Pake

Pake теперь поддерживает создание Android приложений (.apk) из любого веб-сайта!

## Требования

Перед началом убедитесь, что у вас установлены:

### 1. Rust и Cargo
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Android SDK и NDK
Установите через Android Studio или sdkmanager:

**Через Android Studio:**
- Скачайте [Android Studio](https://developer.android.com/studio)
- Установите Android SDK через SDK Manager
- Установите NDK (версия 25+) через SDK Manager

**Или через командную строку:**
```bash
# Установите cmdline-tools
sdkmanager "cmdline-tools;latest"
sdkmanager "platform-tools"
sdkmanager "platforms;android-34"
sdkmanager "ndk;25.2.9519653"
```

### 3. Настройте переменные окружения
```bash
export ANDROID_HOME=$HOME/Android/Sdk  # или путь к вашему SDK
export NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

### 4. Java Development Kit (JDK 17+)
```bash
# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# macOS
brew install openjdk@17

# Установите JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Linux
# или
export JAVA_HOME=/opt/homebrew/opt/openjdk@17  # macOS
```

### 5. Rust Android targets
```bash
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add x86_64-linux-android
rustup target add i686-linux-android
```

### 6. cargo-ndk
```bash
cargo install cargo-ndk
```

## Использование

### Базовое использование
```bash
pake https://example.com --name MyApp --platform android
```

Это создаст `MyApp.apk` в текущей директории.

### Опции для Android

- `--platform android` - включить Android сборку
- `--targets apk` - создать APK (по умолчанию)
- `--targets aab` - создать Android App Bundle (для Google Play Store)
- `--name <имя>` - имя приложения
- `--icon <путь>` - путь к иконке (PNG, 512x512px)
- `--debug` - создать debug сборку

### Примеры

**Создать APK из веб-сайта:**
```bash
pake https://chatgpt.com --name ChatGPT --platform android
```

**Создать AAB для Google Play:**
```bash
pake https://twitter.com --name Twitter --platform android --targets aab
```

**С custom иконкой:**
```bash
pake https://github.com --name GitHub --platform android --icon ./my-icon.png
```

**Debug сборка для тестирования:**
```bash
pake https://example.com --name TestApp --platform android --debug
```

## Установка APK на устройство

### Через ADB
```bash
adb install MyApp.apk
```

### Через файловый менеджер
1. Скопируйте `MyApp.apk` на устройство
2. Откройте файл через файловый менеджер
3. Разрешите установку из неизвестных источников
4. Установите приложение

## Архитектура

Pake для Android использует:
- **Tauri 2.x** - фреймворк для создания кроссплатформенных приложений
- **Android WebView** - для отображения веб-контента
- **Rust** - для нативной логики и безопасности

### Отличия от десктопной версии

| Функция | Десктоп | Android |
|---------|---------|---------|
| System Tray | ✅ | ❌ |
| Global Shortcuts | ✅ | ❌ |
| Window Resize | ✅ | ❌ |
| Menu Bar | ✅ | ❌ |
| Hide on Close | ✅ | ❌ |
| User Agent | Desktop | Mobile |
| Output Format | .dmg/.msi/.deb | .apk/.aab |

## Структура проекта

```
src-tauri/
├── src/
│   ├── app/
│   │   ├── config.rs       # Конфигурация (поддержка Android)
│   │   ├── invoke.rs       # JavaScript-Rust bridge
│   │   ├── setup.rs        # Desktop-only setup (tray, shortcuts)
│   │   └── window.rs       # Управление окнами
│   ├── lib.rs              # Главный entry point
│   └── util.rs             # Утилиты
├── capabilities/
│   └── mobile.json         # Android permissions
├── tauri.android.conf.json # Android конфиг
└── Cargo.toml              # Rust зависимости
```

## Troubleshooting

### ANDROID_HOME not set
```bash
export ANDROID_HOME=$HOME/Android/Sdk
```

### JDK not found
Убедитесь, что `JAVA_HOME` указывает на JDK 17+:
```bash
export JAVA_HOME=/path/to/jdk-17
java -version  # должно показать 17+
```

### NDK not found
```bash
export NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
```

### Rust target not installed
```bash
rustup target add aarch64-linux-android
```

### cargo-ndk not found
```bash
cargo install cargo-ndk
```

## Производительность

- **Размер APK**: ~5-10 MB (vs ~150 MB для Electron/Capacitor)
- **Время запуска**: <1 секунды
- **Использование памяти**: Низкое (нативный WebView)

## Лицензия

MIT

## Поддержка

- Issues: [GitHub Issues](https://github.com/tw93/Pake/issues)
- Discussions: [GitHub Discussions](https://github.com/tw93/Pake/discussions)
