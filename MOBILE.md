# MR Sem Limites — Guia Mobile (Android + iOS + PWA)

## Arquitetura

- Web (SSR) publicada em `https://mrsemlimites.lovable.app`.
- App nativo (Capacitor 8) carrega o mesmo bundle via `server.url`.
- Único deploy backend → paridade total entre web e app.

## Estrutura nativa (helpers)

- `src/lib/platform.ts` — `isNative`, `isAndroid`, `isIOS`, `isWeb`, `isPWA`, `getPlatform`.
- `src/lib/native-init.ts` — splash, status bar, back-button Android, interceptor de links externos.
- `src/lib/native-links.ts` — `openExternal(url)` + interceptor global para `<a target="_blank">` / links de domínio externo → abre no `@capacitor/browser` (in-app browser tab).

## Comportamento nativo já implementado

- Splash escondida após hidratação.
- Status bar dark, cor `#0a0a0f`.
- Back button Android: fecha modal aberto → volta histórico → confirma "toque de novo para sair" (2s) antes de encerrar.
- Links externos abrem em Chrome Custom Tab / SFSafariViewController (não vazam o WebView).
- `-webkit-tap-highlight-color: transparent`, sem callout iOS, sem overscroll bounce.
- Safe-area (`env(safe-area-inset-*)`) mapeada para `--sat/sar/sab/sal`.
- `font-size: max(16px, 1rem)` em inputs → sem zoom iOS ao focar.

## Preparação para publicação

### Android (Play Store)

- [ ] `npx cap add android` (gera `android/`).
- [ ] Ícone adaptativo: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` (foreground + background).
- [ ] Splash Android 12+: `values/styles.xml` com `windowSplashScreenBackground` e `windowSplashScreenAnimatedIcon`.
- [ ] `AndroidManifest.xml`:
      - `versionCode` / `versionName`.
      - Intent filter deep link:
        ```xml
        <intent-filter android:autoVerify="true">
          <action android:name="android.intent.action.VIEW"/>
          <category android:name="android.intent.category.DEFAULT"/>
          <category android:name="android.intent.category.BROWSABLE"/>
          <data android:scheme="https" android:host="mrsemlimites.lovable.app"/>
        </intent-filter>
        ```
- [ ] `assetlinks.json` publicado em `https://mrsemlimites.lovable.app/.well-known/assetlinks.json`.
- [ ] Keystore de upload (`keytool -genkey ...`) + Play App Signing.
- [ ] `targetSdkVersion 34` (obrigatório 2026).
- [ ] Screenshots (2+ 1080×1920), feature graphic 1024×500.
- [ ] Data Safety form + Privacy Policy URL pública.

### iOS (App Store)

- [ ] `npx cap add ios` (gera `ios/`).
- [ ] AppIcon.appiconset completo (1024×1024 + variantes automáticas).
- [ ] Launch Screen: `LaunchScreen.storyboard` com background `#0a0a0f`.
- [ ] `Info.plist`:
      - `CFBundleShortVersionString` / `CFBundleVersion`.
      - `NSAppTransportSecurity` deixar padrão (HTTPS enforced).
- [ ] Associated Domains entitlement: `applinks:mrsemlimites.lovable.app`.
- [ ] `apple-app-site-association` publicado em `https://mrsemlimites.lovable.app/.well-known/apple-app-site-association` (JSON, sem extensão, `Content-Type: application/json`).
- [ ] `PrivacyInfo.xcprivacy` (Privacy Manifest — obrigatório desde 2024).
- [ ] Screenshots iPhone 6.7"/6.1", iPad 12.9" (se suportar).
- [ ] App Privacy report no App Store Connect.

### PWA

- [x] Manifest, ícones 192/512 + maskable.
- [x] `apple-touch-icon`, `theme-color`, `apple-mobile-web-app-capable`.
- [ ] Otimizar peso dos ícones PNG (471 KB → alvo <100 KB).

## Deep links (fluxo)

1. Usuário clica `https://mrsemlimites.lovable.app/reset-password?token=...` no email.
2. Android verifica `assetlinks.json` → abre o app direto.
3. iOS verifica `apple-app-site-association` → abre o app direto.
4. WebView carrega a rota TanStack normalmente → fluxo idêntico à web.
5. OAuth callback usa `${window.location.origin}` — mesmo funcionamento em app e web.

## O que NÃO está implementado (fases futuras)

- Push notifications (`@capacitor/push-notifications` + FCM/APNs).
- Biometria (`@capacitor-community/biometric-auth`).
- Câmera, microfone, GPS.
- Secure storage nativo para tokens Supabase (hoje ainda em localStorage).
- Rate limit em server functions críticas.
- CSP meta tag (requer allow-list de Supabase + Lovable AI + fontes).
