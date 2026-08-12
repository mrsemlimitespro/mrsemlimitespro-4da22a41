#!/usr/bin/env bash
# ==============================================================================
# Gera ícones e splash nativos a partir de resources/icon.png e resources/splash.png
# usando @capacitor/assets. Não fica como dependência do bundle web.
# ==============================================================================
set -euo pipefail

if [ ! -f resources/icon.png ] || [ ! -f resources/splash.png ]; then
  echo "❌ Coloque resources/icon.png (1024×1024) e resources/splash.png (2732×2732) antes de rodar."
  echo "   O ícone deve ter margens seguras; o splash deve ter o logo centralizado."
  exit 1
fi

npx --yes @capacitor/assets generate \
  --iconBackgroundColor "#0a0a0f" \
  --iconBackgroundColorDark "#0a0a0f" \
  --splashBackgroundColor "#0a0a0f" \
  --splashBackgroundColorDark "#0a0a0f"

echo "✅ Ícones e splash gerados. Rode 'bun run cap:sync' para propagar."
