#!/usr/bin/env bash
# ==============================================================================
# MR Sem Limites — Native Prepare
#
# Prepara o projeto para gerar aplicativos nativos (Android APK/AAB e iOS IPA).
# Roda 100% localmente, fora do Lovable.
#
# Requisitos:
#   - Node 20+ e Bun ou npm
#   - JDK 17 + Android Studio (Android)
#   - Xcode 15+ / macOS (iOS)
#
# Uso:
#   bun install
#   bun run native:prepare        # build web + cap add + cap sync
#   bun run native:assets         # gera ícones e splash a partir de resources/
#   bun run cap:android           # abre no Android Studio
#   bun run cap:ios               # abre no Xcode (macOS)
# ==============================================================================
set -euo pipefail

echo "▶ 1/5  Build web (dist estática em www/)"
if command -v bun >/dev/null 2>&1; then
  bun run build
else
  npm run build
fi

# TanStack Start emite para .output/ — Capacitor lê de webDir=www.
# Como usamos server.url apontando para o site publicado, www/ pode conter
# apenas o index.html mínimo (fallback offline). Já existe em www/index.html.
mkdir -p www
if [ ! -f www/index.html ]; then
  cat > www/index.html <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><title>MR Sem Limites</title></head>
<body><script>location.href="https://mrsemlimites.lovable.app";</script></body></html>
HTML
fi

echo "▶ 2/5  Adicionar plataforma Android (idempotente)"
if [ ! -d android ]; then
  npx cap add android
else
  echo "   android/ já existe — pulando."
fi

echo "▶ 3/5  Adicionar plataforma iOS (apenas em macOS)"
if [ "$(uname -s)" = "Darwin" ]; then
  if [ ! -d ios ]; then
    npx cap add ios
  else
    echo "   ios/ já existe — pulando."
  fi
else
  echo "   Sistema não é macOS — pulando iOS. Rode este script em um Mac para gerar ios/."
fi

echo "▶ 4/5  Copiar overrides nativos (AndroidManifest, Info.plist, .well-known)"
bash scripts/apply-native-overrides.sh

echo "▶ 5/5  cap sync (copia assets web + plugins nativos)"
npx cap sync

echo ""
echo "✅ Preparação concluída."
echo ""
echo "Próximos passos:"
echo "  • Ícones/Splash:   bun run native:assets"
echo "  • Android Studio:  bun run cap:android"
echo "  • Xcode (macOS):   bun run cap:ios"
echo "  • APK debug:       bun run native:android:apk"
echo "  • AAB release:     bun run native:android:aab   (requer keystore)"
echo "  • IPA archive:     bun run native:ios:archive   (macOS + Apple Developer)"
