# 🤖 Android CI/CD — Что нужно настроить

## ✅ Что уже сделано

1. **Workflow `android-build.yml`** — ручная сборка одного приложения (в `docs/workflows/`)
2. **Workflow `android-batch.yml`** — массовая сборка (в `docs/workflows/`)
3. **Rust + TypeScript код** полностью готов к Android (см. предыдущий коммит)

## ⚠️ ВАЖНО: Скопировать workflow файлы

GitHub не позволяет пушить файлы в `.github/workflows/` через API. Тебе нужно вручную скопировать их:

```bash
# В корне репозитория Pake
cp docs/workflows/android-build.yml .github/workflows/
cp docs/workflows/android-batch.yml .github/workflows/

# Закоммитить и запушить
git add .github/workflows/android-*.yml
git commit -m "ci: add Android build workflows"
git push origin arena/019f98d0-pake
```

---

## 📋 Что нужно сделать тебе

### 1. Включить GitHub Actions (если отключены)

Перейди в:
```
Settings → Actions → General → "Allow all actions and reusable workflows"
```

### 2. Добавить Secrets (опционально, для подписи APK)

Перейди в:
```
Settings → Secrets and variables → Actions → New repository secret
```

| Secret Name | Описание | Обязательно? |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Приватный ключ для подписи Tauri (updater) | ❌ Нет |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Пароль к ключу | ❌ Нет |

> ⚠️ Без secrets APK будет собран с debug-подписью. Для Google Play нужна release-подпись (инструкции ниже).

### 3. Запустить первую сборку

1. Перейди в **Actions** → **Build Android App**
2. Нажми **Run workflow**
3. Заполни параметры:
   - `name`: `chatgpt` (латиница, без пробелов)
   - `title`: `ChatGPT` (отображаемое имя)
   - `url`: `https://chat.openai.com`
   - `target`: `apk`
4. Нажми **Run workflow**

Первая сборка займёт **15-30 минут** (компиляция Rust зависимостей).

### 4. Скачать APK

После сборки:
1. Перейди в **Actions** → найди завершённый workflow
2. Внизу страницы → **Artifacts** → скачай `chatgpt-android-apk`
3. Разархивируй → получишь `chatgpt.apk`

---

## 🔐 Подпись APK для Google Play

Для публикации в Google Play Store нужна **release-подпись**:

### Вариант 1: Keystore через GitHub Secrets

1. Создай keystore:
```bash
keytool -genkey -v -keystore release.keystore -alias pake -keyalg RSA -keysize 2048 -validity 10000
```

2. Base64-кодируй keystore:
```bash
base64 -i release.keystore | pbcopy  # macOS
base64 -i release.keystore | xclip   # Linux
```

3. Добавь в GitHub Secrets:
   - `ANDROID_KEYSTORE` — base64 keystore
   - `ANDROID_KEYSTORE_PASSWORD` — пароль от keystore
   - `ANDROID_KEY_ALIAS` — alias (например, `pake`)
   - `ANDROID_KEY_PASSWORD` — пароль от ключа

### Вариант 2: Подписать локально после скачивания

```bash
# Скачай APK из GitHub Actions
# Подпиши своим keystore:
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore release.keystore chatgpt.apk pake

# Оптимизируй для Google Play:
zipalign -v 4 chatgpt.apk chatgpt-aligned.apk
```

---

## 🏗️ Архитектура CI

```
┌─────────────────────────────────────────────────┐
│            GitHub Actions Runner                  │
│                                                   │
│  1. Checkout code                                │
│  2. Setup Node.js 22 + pnpm                     │
│  3. Setup JDK 17 (Temurin)                      │
│  4. Setup Android SDK + NDK 25                  │
│  5. Setup Rust + cargo-ndk                      │
│  6. Build CLI (pnpm cli:build)                  │
│  7. node dist/cli.js <url> --platform android   │
│  8. Upload artifact (.apk/.aab)                 │
└─────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### "Workflow not found"
- Убедись что файлы в `.github/workflows/` закоммичены и запушены

### "Rust compilation error"
- Проверь что `Cargo.toml` содержит правильные `cfg(not(target_os = "android"))` атрибуты

### "Android SDK not found"
- Workflow использует `android-actions/setup-android@v3`, должен работать автоматически

### "Out of memory"
- Android сборка требует ~4GB RAM. GitHub runners дают 7GB, должно хватить

### "Build timeout"
- Первый build может занять до 30 минут. Увеличь `timeout-minutes` если нужно

---

## 📊 Ожидаемые размеры артефактов

| App | APK Size | AAB Size |
|-----|----------|----------|
| ChatGPT | ~6-8 MB | ~5-7 MB |
| Twitter | ~6-8 MB | ~5-7 MB |
| YouTube | ~6-8 MB | ~5-7 MB |

Для сравнения: нативные приложения → 50-150 MB.
