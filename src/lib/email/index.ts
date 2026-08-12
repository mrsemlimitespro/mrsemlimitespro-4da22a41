import type { EmailProvider } from "./types";
import { makeMockEmailProvider } from "./mock";
import { makeResendProvider } from "./resend";
import { makeDisabledEmailProvider } from "./disabled";

/**
 * Options para seleção do provider real de envio.
 *  - `enabled`: valor de `admin_settings.email_enabled`. Enquanto for
 *    `false`, o sistema usa o DisabledEmailProvider (apenas loga).
 *    Assim que o cliente verificar o domínio no Resend e ativar a flag,
 *    o envio real passa a acontecer sem alterar mais nada.
 */
export type ProviderSelectionOptions = {
  enabled?: boolean;
};

/**
 * Seleciona o provider de email ativo.
 *
 * Ordem de decisão:
 *   1. Se `enabled === false` → DisabledEmailProvider (apenas log).
 *   2. `EMAIL_PROVIDER` (env) força um adapter explícito.
 *   3. Se `RESEND_API_KEY` estiver presente → Resend.
 *   4. Fallback → MockEmailProvider (log-only).
 *
 * Adicionar um provider novo (SMTP, SES, Mailgun, SendGrid) é isolado:
 * implementar `EmailProvider` num arquivo próprio e plugá-lo aqui.
 * Nenhuma outra parte do sistema precisa mudar (Adapter Pattern).
 */
export function getEmailProvider(opts: ProviderSelectionOptions = {}): EmailProvider {
  if (opts.enabled === false) {
    return makeDisabledEmailProvider("email_disabled_flag");
  }

  const kind = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  const resendKey = process.env.RESEND_API_KEY;

  if (kind === "mock") return makeMockEmailProvider();
  if (kind === "resend" || (!kind && resendKey)) {
    if (!resendKey) return makeDisabledEmailProvider("missing_resend_key");
    return makeResendProvider(resendKey);
  }

  // Placeholders — plugar quando o cliente fornecer as credenciais.
  if (["smtp", "sendgrid", "ses", "mailgun"].includes(kind)) {
    return makeDisabledEmailProvider(`provider_not_implemented:${kind}`);
  }

  return makeMockEmailProvider();
}

export type { EmailProvider, EmailMessage, EmailSendResult } from "./types";
