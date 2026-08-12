import { useEffect, useState } from "react";
import {
  getImpersonation,
  subscribeImpersonation,
  type ImpersonationState,
} from "@/lib/impersonation";

/** Reactivo: retorna o estado atual de impersonação (ou null). */
export function useImpersonation(): ImpersonationState | null {
  const [state, setState] = useState<ImpersonationState | null>(() => getImpersonation());
  useEffect(() => {
    const sync = () => setState(getImpersonation());
    sync();
    return subscribeImpersonation(sync);
  }, []);
  return state;
}
