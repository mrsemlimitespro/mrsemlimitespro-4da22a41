# NATIVE BUILD — MR Sem Limites

Guia completo para transformar o projeto em **APK / AAB (Android)** e **IPA (iOS)** instaláveis.
O Lovable prepara todo o código e configuração. A **geração dos binários** acontece
localmente, em Android Studio e Xcode — não há como o Lovable emitir binários assinados
por conta própria (Google e Apple exigem ambientes de build locais).

---

## 0. Pré-requisitos (uma vez por máquina)

**Comuns**
- Node 20+ e [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)
- Git

**Android**
- JDK 17 (Temurin recomendado)
- [Android Studio Ladybug+](https://developer.android.com/studio)
- Aceitar licenças: `yes | sdkmanager --licenses`
- Variável: `ANDROID_HOME=~/Library/Android/sdk` (macOS) ou `%LOCALAPPDATA%\Android\Sdk` (Windows)

**iOS (macOS obrigatório)**
- Xcode 15+ (App Store)
- CocoaPods: `sudo gem install cocoapods`
- Conta Apple Developer ativa (99 USD/ano) para TestFlight / App Store

---

## 1. Clonar e instalar

```bash
git clone <URL_DO_REPO_LOVABLE>
cd mr-sem-limites
bun install
```

## 2. Preparar o projeto nativo (uma vez)

```bash
bun run native:prepare
```

Este script:
1. Faz o build web (`www/`).
2. Roda `npx cap add android` (e `ios` se estiver em macOS).
3. Aplica overrides em `AndroidManifest.xml`, `Info.plist`, `App.entitlements`.
4. Roda `cap sync`.

## 3. Ícones e Splash

1. Coloque `resources/icon.png` (1024×1024) e `resources/splash.png` (2732×2732). Ver `resources/README.md`.
2. Rode:
   ```bash
   bun run native:assets
   bun run cap:sync
   ```

## 4. Abrir nos IDEs (desenvolvimento)

```bash
bun run cap:android     # Android Studio
bun run cap:ios         # Xcode (macOS)
```

Rodar em dispositivo conectado:

```bash
bun run cap:run:android
bun run cap:run:ios
```

---

## 5. Build ANDROID — APK de teste

```bash
bun run native:android:apk
# → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 6. Build ANDROID — AAB (Google Play)

### 6.1 Criar o keystore de upload (uma vez, GUARDE COM SEGURANÇA)

```bash
keytool -genkey -v -keystore ~/keystores/mrsl-upload.jks \
  -alias mrsl-upload -keyalg RSA -keysize 2048 -validity 10000
```

Copie o SHA-256 do certificado:
```bash
keytool -list -v -keystore ~/keystores/mrsl-upload.jks -alias mrsl-upload | grep SHA256
```
Cole no `public/.well-known/assetlinks.json` (substitui `SUBSTITUA_PELO_SHA256...`).
Publique o site novamente para o Google validar Deep Links.

### 6.2 Exportar variáveis e gerar o AAB

```bash
export MRSL_KEYSTORE=~/keystores/mrsl-upload.jks
export MRSL_KEYSTORE_PASS='sua-senha-loja'
export MRSL_KEY_ALIAS=mrsl-upload
export MRSL_KEY_PASS='sua-senha-chave'

bun run native:android:aab
# → android/app/build/outputs/bundle/release/app-release.aab
```

Envie o AAB pelo **Google Play Console → Internal testing** primeiro.

---

## 7. Build iOS — Archive + IPA (App Store / TestFlight)

Em macOS:

```bash
export MRSL_TEAM_ID=SEU_TEAM_ID   # Apple Developer > Membership
bun run native:ios:archive
# → build/ios/export/App.ipa
```

Upload:
- **Transporter.app** (App Store) — arraste o `.ipa`, ou
- `xcrun altool --upload-app -f build/ios/export/App.ipa -t ios -u seu@email.com -p @keychain:AC_PASSWORD`

Preencha depois no App Store Connect:
- Privacy Manifest (`ios/App/App/PrivacyInfo.xcprivacy`)
- Screenshots iPhone 6.7" / 6.1"
- Descrição, categoria, política de privacidade

### 7.1 Deep Links iOS
Substitua `SUBSTITUA_TEAM_ID` em `public/.well-known/apple-app-site-association` pelo seu Team ID e publique.
Servir com `Content-Type: application/json` (o Lovable já entrega assim para `/.well-known/*`).

---

## 8. Checklist de publicação

### Android (Google Play)
- [ ] `applicationId` = `app.lovable.mrsemlimites` (já em `capacitor.config.ts`)
- [ ] `versionCode` incrementado a cada envio (`android/app/build.gradle`)
- [ ] `versionName` (semver, ex: `1.0.0`)
- [ ] `targetSdkVersion 34` (default do Capacitor 8)
- [ ] Ícone adaptativo + splash gerados
- [ ] AAB assinado com keystore de upload
- [ ] `assetlinks.json` publicado e com SHA-256 correto
- [ ] Data Safety form + Privacy Policy URL
- [ ] Screenshots (2+ em 1080×1920) e feature graphic 1024×500

### iOS (App Store)
- [ ] `CFBundleIdentifier` = `app.lovable.mrsemlimites`
- [ ] `CFBundleVersion` (build) e `CFBundleShortVersionString` (versão)
- [ ] AppIcon 1024×1024 + variantes
- [ ] `PrivacyInfo.xcprivacy` preenchido
- [ ] Entitlements: `aps-environment=production`, `applinks:mrsemlimites.lovable.app`
- [ ] Descrições de permissão (`NSCameraUsageDescription`, etc.) — já aplicadas
- [ ] Push: chave APNs (.p8) enviada ao provedor (Supabase / FCM)
- [ ] Screenshots iPhone 6.7"/6.1"

---

## 9. Estratégia do bundle

`capacitor.config.ts` está com `server.url = "https://mrsemlimites.lovable.app"`.
Isso significa que o **app nativo carrega o site publicado**, garantindo:

- Um único deploy (paridade total web/app).
- Atualização instantânea sem reenviar à loja para mudanças de UI.
- Server functions, SSR, Realtime, Auth idênticos.

Para publicar uma versão **offline empacotada** (sem depender de `mrsemlimites.lovable.app`):
1. Comente a linha `url:` em `capacitor.config.ts`.
2. Copie o output do build (`.output/public/*`) para `www/`.
3. Rode `bun run cap:sync` e gere APK/IPA normalmente.

---

## 10. Troubleshooting

| Sintoma                                              | Causa provável                                   | Solução                                             |
| ---------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| `SDK location not found`                             | `ANDROID_HOME` não definido                      | Exportar variável ou criar `android/local.properties` |
| `Signing config has no key file`                     | Variáveis `MRSL_*` não exportadas                | Verificar `export` no shell atual                   |
| Deep link abre no navegador em vez do app            | `assetlinks.json` sem SHA-256 correto            | Republicar site com JSON atualizado                 |
| `pod install` falha                                  | CocoaPods desatualizado                          | `sudo gem install cocoapods && pod repo update`     |
| Push notification não chega em iOS                   | Chave APNs / entitlement não configurados        | Ver `App.entitlements` e Supabase Push settings     |
| Tela branca ao abrir o app                           | `server.url` inacessível                         | Verificar rede + certificado; ou empacotar offline  |

---

**Pronto.** Com esses três comandos você já tem o app instalável:

```bash
bun run native:prepare      # 1x
bun run native:assets       # quando alterar branding
bun run native:android:apk  # gerar APK para testes
```
