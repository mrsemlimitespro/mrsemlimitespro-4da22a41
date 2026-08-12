/**
 * Configuração central do Extension License SDK.
 * Copie este arquivo para `license.config.ts` na raiz da sua extensão
 * e ajuste os valores. Nenhum segredo real deve morar aqui — o `anonKey`
 * é público por design (mesmo padrão da chave anon do Supabase).
 */
import type { LicenseConfig } from "./src/types";

export const licenseConfig: LicenseConfig = {
  // Identidade da extensão
  extensionName: "MR Sem Limites 2.2",
  extensionId: "mr-sem-limites",
  version: "2.2.7",
  productName: "MR Sem Limites",
  logoUrl: "/logo.png",

  // Comunicação
  apiBaseUrl: "https://mrsemlimites.lovable.app/api/public/ext",
  panelUrl: "https://mrsemlimites.lovable.app",
  anonKey: "mrlov",
  timeoutMs: 15_000,
  cacheTtlMs: 60_000,

  // Regras de licença (defaults; o servidor tem a palavra final)
  trialMinutes: 30,
  paidDays: 30,

  endpoints: {
    injectConfig: "/functions/v1/inject-config",
    validateV2: "/functions/v1/validate-license-v2",
    heartbeat: "/licenca/heartbeat",
    renovar: "/licenca/renovar",
    revogar: "/licenca/revogar",
    resetHwid: "/licenca/reset-hwid",
    config: "/licenca/config",
    consulta: "/licenca/consulta",
  },
};
