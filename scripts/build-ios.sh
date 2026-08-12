#!/usr/bin/env bash
# ==============================================================================
# Build iOS — Archive + Export IPA. Somente macOS com Xcode 15+.
#
# Uso:
#   export MRSL_TEAM_ID=ABCDE12345         # Apple Developer Team ID
#   bash scripts/build-ios.sh
#
# Gera:
#   build/ios/MRSemLimites.xcarchive
#   build/ios/export/App.ipa
#
# Depois:
#   • TestFlight: abra o .xcarchive no Xcode → Distribute App → App Store Connect
#   • Ou submeta o .ipa via `xcrun altool --upload-app`
# ==============================================================================
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "❌ iOS builds só rodam em macOS."
  exit 1
fi

if [ ! -d ios ]; then
  echo "❌ Pasta ios/ não existe. Rode em um Mac: bun run native:prepare"
  exit 1
fi

: "${MRSL_TEAM_ID:?defina MRSL_TEAM_ID (Apple Developer Team ID)}"

echo "▶ cap sync"
npx cap sync ios

echo "▶ pod install"
(cd ios/App && pod install)

BUILD=build/ios
mkdir -p "$BUILD"

echo "▶ xcodebuild archive"
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -archivePath "$BUILD/MRSemLimites.xcarchive" \
  DEVELOPMENT_TEAM="$MRSL_TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  archive

cat > "$BUILD/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key><string>app-store</string>
    <key>teamID</key><string>$MRSL_TEAM_ID</string>
    <key>signingStyle</key><string>automatic</string>
    <key>uploadBitcode</key><false/>
    <key>uploadSymbols</key><true/>
</dict>
</plist>
PLIST

echo "▶ xcodebuild -exportArchive"
xcodebuild -exportArchive \
  -archivePath "$BUILD/MRSemLimites.xcarchive" \
  -exportPath "$BUILD/export" \
  -exportOptionsPlist "$BUILD/ExportOptions.plist"

echo ""
echo "✅ IPA em: $BUILD/export/App.ipa"
echo "   Envie via Transporter.app ou:"
echo "   xcrun altool --upload-app -f $BUILD/export/App.ipa -t ios -u SEU_APPLE_ID --password APP_SPECIFIC_PASSWORD"
