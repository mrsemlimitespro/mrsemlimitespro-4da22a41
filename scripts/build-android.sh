#!/usr/bin/env bash
# ==============================================================================
# Build Android — APK (debug) ou AAB (release, requer keystore).
#
# Uso:
#   bash scripts/build-android.sh apk    # gera app-debug.apk
#   bash scripts/build-android.sh aab    # gera app-release.aab (assinado)
#
# Para AAB, exporte antes:
#   export MRSL_KEYSTORE=/caminho/upload-keystore.jks
#   export MRSL_KEYSTORE_PASS=...
#   export MRSL_KEY_ALIAS=mrsl-upload
#   export MRSL_KEY_PASS=...
#
# Se ainda não tiver keystore:
#   keytool -genkey -v -keystore upload-keystore.jks -alias mrsl-upload \
#     -keyalg RSA -keysize 2048 -validity 10000
# ==============================================================================
set -euo pipefail

MODE="${1:-apk}"

if [ ! -d android ]; then
  echo "❌ Pasta android/ não existe. Rode antes: bun run native:prepare"
  exit 1
fi

echo "▶ cap sync"
npx cap sync android

cd android

if [ "$MODE" = "apk" ]; then
  echo "▶ Gradle: assembleDebug"
  ./gradlew assembleDebug
  echo ""
  echo "✅ APK gerado em:"
  echo "   android/app/build/outputs/apk/debug/app-debug.apk"
  echo ""
  echo "Instalar no aparelho conectado via USB:"
  echo "   adb install -r app/build/outputs/apk/debug/app-debug.apk"
elif [ "$MODE" = "aab" ]; then
  : "${MRSL_KEYSTORE:?defina MRSL_KEYSTORE}"
  : "${MRSL_KEYSTORE_PASS:?defina MRSL_KEYSTORE_PASS}"
  : "${MRSL_KEY_ALIAS:?defina MRSL_KEY_ALIAS}"
  : "${MRSL_KEY_PASS:?defina MRSL_KEY_PASS}"

  # Injeta bloco signingConfig em android/app/build.gradle se ausente
  BG=app/build.gradle
  if ! grep -q "mrslRelease" "$BG"; then
    python3 - "$BG" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p).read()
block = '''
    signingConfigs {
        mrslRelease {
            storeFile file(System.getenv("MRSL_KEYSTORE"))
            storePassword System.getenv("MRSL_KEYSTORE_PASS")
            keyAlias System.getenv("MRSL_KEY_ALIAS")
            keyPassword System.getenv("MRSL_KEY_PASS")
        }
    }
'''
s = re.sub(r'(android\s*\{)', r'\1' + block, s, count=1)
s = re.sub(
    r'(buildTypes\s*\{\s*release\s*\{)',
    r'\1\n            signingConfig signingConfigs.mrslRelease',
    s, count=1)
open(p, "w").write(s)
PY
    echo "   ✓ signingConfig injetado"
  fi

  echo "▶ Gradle: bundleRelease"
  ./gradlew bundleRelease
  echo ""
  echo "✅ AAB gerado em:"
  echo "   android/app/build/outputs/bundle/release/app-release.aab"
  echo "   → Envie pelo Google Play Console (Internal testing → Production)."
else
  echo "❌ Modo desconhecido: $MODE (use 'apk' ou 'aab')"
  exit 1
fi
