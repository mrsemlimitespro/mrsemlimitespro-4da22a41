/**
 * NetworkStatusWatcher — mostra toasts sonner quando a conexão cai/volta e
 * dispara uma invalidação global do TanStack Query (sync automático) ao
 * reconectar. Monta uma única vez no layout `_app`.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { NativeService } from "@/native/NativeService";
import type { NetworkStatus } from "@/native/NetworkService";

const OFFLINE_TOAST_ID = "network-offline";

export function NetworkStatusWatcher() {
  const queryClient = useQueryClient();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    void NativeService.network.getStatus().then((r) => {
      if (!mounted || !r.ok) return;
      wasOfflineRef.current = !r.data.connected;
      if (!r.data.connected) {
        toast.warning("Você está offline. Algumas ações podem falhar.", {
          id: OFFLINE_TOAST_ID,
          duration: Infinity,
        });
      }
    });

    const unsubscribe = NativeService.network.onChange((status: NetworkStatus) => {
      if (!status.connected) {
        wasOfflineRef.current = true;
        toast.warning("Sem conexão. Verifique sua internet.", {
          id: OFFLINE_TOAST_ID,
          duration: Infinity,
        });
        return;
      }
      // Reconectou.
      toast.dismiss(OFFLINE_TOAST_ID);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        toast.success("Conexão restabelecida. Sincronizando…", { duration: 2500 });
        // Refresca todas as queries — dados voltam a ficar fresquinhos.
        void queryClient.invalidateQueries();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [queryClient]);

  return null;
}
