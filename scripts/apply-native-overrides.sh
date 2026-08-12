#!/usr/bin/env bash
# ==============================================================================
# Aplica overrides nativos após `cap add` — chamado por native-prepare.sh.
# Idempotente: só copia se o arquivo alvo existir.
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ---------- Android ----------
if [ -d "$ROOT/android" ]; then
  echo "  › Android overrides"

  MANIFEST="$ROOT/android/app/src/main/AndroidManifest.xml"
  if [ -f "$MANIFEST" ] && ! grep -q "assetlinks-mrsl" "$MANIFEST"; then
    # Injeta intent-filter de deep link https://mrsemlimites.lovable.app
    # dentro da MainActivity (marcador `assetlinks-mrsl` evita reaplicar).
    python3 - "$MANIFEST" <<'PY'
import re, sys, io
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
inject = '''
            <!-- assetlinks-mrsl: deep link para o domínio publicado -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT"/>
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="https" android:host="mrsemlimites.lovable.app"/>
            </intent-filter>'''
s2 = re.sub(r'(</activity>)', inject + r'\n        \1', s, count=1)
open(p, "w", encoding="utf-8").write(s2)
PY
    echo "     ✓ AndroidManifest.xml: intent-filter deep link injetado"
  fi

  # Permissões extras (Push/Camera já são adicionadas pelos plugins)
  PROGUARD="$ROOT/android/app/proguard-rules.pro"
  if [ -f "$PROGUARD" ] && ! grep -q "MRSL keep rules" "$PROGUARD"; then
    cat >> "$PROGUARD" <<'PRO'

# --- MRSL keep rules ---
-keep class com.getcapacitor.** { *; }
-keep class app.lovable.mrsemlimites.** { *; }
PRO
    echo "     ✓ proguard-rules.pro atualizado"
  fi
fi

# ---------- iOS ----------
if [ -d "$ROOT/ios" ]; then
  echo "  › iOS overrides"

  PLIST="$ROOT/ios/App/App/Info.plist"
  if [ -f "$PLIST" ] && ! /usr/libexec/PlistBuddy -c "Print :NSCameraUsageDescription" "$PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string 'Usado para tirar fotos de perfil, capas e comprovantes.'" "$PLIST" || true
    /usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'Usado para escolher imagens da sua galeria.'" "$PLIST" || true
    /usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryAddUsageDescription string 'Usado para salvar imagens geradas na sua galeria.'" "$PLIST" || true
    /usr/libexec/PlistBuddy -c "Add :NSFaceIDUsageDescription string 'Usado para desbloquear seu login com Face ID.'" "$PLIST" || true
    /usr/libexec/PlistBuddy -c "Add :NSMicrophoneUsageDescription string 'Usado para gravar áudio quando você escolher.'" "$PLIST" || true
    /usr/libexec/PlistBuddy -c "Add :NSLocationWhenInUseUsageDescription string 'Usado para recursos baseados em localização, quando você optar.'" "$PLIST" || true
    /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes: string 'remote-notification'" "$PLIST" 2>/dev/null || true
    echo "     ✓ Info.plist: permissões e background modes"
  fi

  # Entitlements: Associated Domains + APS Push
  ENTITLE="$ROOT/ios/App/App/App.entitlements"
  if [ ! -f "$ENTITLE" ]; then
    cat > "$ENTITLE" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>aps-environment</key>
    <string>production</string>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:mrsemlimites.lovable.app</string>
    </array>
</dict>
</plist>
XML
    echo "     ✓ App.entitlements criado (Push + Associated Domains)"
  fi
fi

echo "  › Overrides aplicados."
