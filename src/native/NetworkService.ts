/**
 * NetworkService — estado da conexão + assinatura de mudanças.
 *
 * Plugin nativo: @capacitor/network.
 * Web/PWA: navigator.onLine + eventos online/offline.
 */
import { isNative } from "@/lib/platform";
import { type NativeResult, ok, safeCall } from "./types";

export type ConnectionType = "wifi" | "cellular" | "none" | "unknown";

export interface NetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
}

type Unsubscribe = () => void;

async function nativeGet(): Promise<NetworkStatus> {
  const { Network } = await import("@capacitor/network");
  const s = await Network.getStatus();
  return {
    connected: s.connected,
    connectionType: (s.connectionType ?? "unknown") as ConnectionType,
  };
}

export const NetworkService = {
  async getStatus(): Promise<NativeResult<NetworkStatus>> {
    if (!isNative()) {
      const connected = typeof navigator !== "undefined" ? navigator.onLine : true;
      return ok({ connected, connectionType: connected ? "unknown" : "none" });
    }
    return safeCall("Network.getStatus", nativeGet);
  },

  onChange(cb: (status: NetworkStatus) => void): Unsubscribe {
    if (typeof window === "undefined") return () => {};

    if (!isNative()) {
      const emit = () =>
        cb({
          connected: navigator.onLine,
          connectionType: navigator.onLine ? "unknown" : "none",
        });
      window.addEventListener("online", emit);
      window.addEventListener("offline", emit);
      return () => {
        window.removeEventListener("online", emit);
        window.removeEventListener("offline", emit);
      };
    }

    let handle: { remove: () => Promise<void> } | null = null;
    let cancelled = false;
    void import("@capacitor/network").then(async ({ Network }) => {
      if (cancelled) return;
      handle = await Network.addListener("networkStatusChange", (s) => {
        cb({
          connected: s.connected,
          connectionType: (s.connectionType ?? "unknown") as ConnectionType,
        });
      });
    });
    return () => {
      cancelled = true;
      void handle?.remove();
    };
  },
};
