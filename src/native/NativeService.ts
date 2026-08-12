/**
 * NativeService — fachada única para toda a camada nativa.
 *
 * REGRA DE OURO: nenhum componente/hook do app importa plugins do
 * Capacitor diretamente. Sempre passe por `NativeService.<área>.<ação>`.
 *
 * Exemplo:
 *   import { NativeService } from "@/native/NativeService";
 *   const r = await NativeService.browser.open({ url: "https://..." });
 *   if (!r.ok) console.warn(r.error.code, r.error.message);
 *
 * Vantagens:
 *   - Um único ponto para trocar de plugin sem tocar em telas.
 *   - Mocks e fallbacks web/PWA já embutidos por serviço.
 *   - Contrato uniforme (`NativeResult<T>`) — sem try/catch nas telas.
 */
import { getPlatform, isNative, isAndroid, isIOS, isWeb, isPWA } from "@/lib/platform";

import { BiometricService } from "./BiometricService";
import { BrowserService } from "./BrowserService";
import { CameraService } from "./CameraService";
import { ClipboardService } from "./ClipboardService";
import { DeepLinksService } from "./DeepLinksService";
import { DeviceService } from "./DeviceService";
import { FilesService } from "./FilesService";
import { GeolocationService } from "./GeolocationService";
import { HapticsService } from "./HapticsService";
import { MicrophoneService } from "./MicrophoneService";
import { NetworkService } from "./NetworkService";
import { PermissionsService } from "./PermissionsService";
import { PushService } from "./PushService";
import { ShareService } from "./ShareService";
import { StorageService } from "./StorageService";

export const NativeService = {
  // Meta
  platform: {
    get current() {
      return getPlatform();
    },
    isNative,
    isAndroid,
    isIOS,
    isWeb,
    isPWA,
  },

  // Serviços
  biometric: BiometricService,
  browser: BrowserService,
  camera: CameraService,
  clipboard: ClipboardService,
  deepLinks: DeepLinksService,
  device: DeviceService,
  files: FilesService,
  geolocation: GeolocationService,
  haptics: HapticsService,
  microphone: MicrophoneService,
  network: NetworkService,
  permissions: PermissionsService,
  push: PushService,
  share: ShareService,
  storage: StorageService,
} as const;

export type { NativeResult, NativeError, NativeErrorCode, Platform } from "./types";
