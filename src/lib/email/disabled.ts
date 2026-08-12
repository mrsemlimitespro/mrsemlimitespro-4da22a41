import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

/**
 * DisabledEmailProvider — usado quando `admin_settings.email_enabled = false`
 * ou quando não há domínio verificado / RESEND_API_KEY. Não envia nada:
 * apenas registra um log estruturado, permitindo que todo o fluxo da
 * aplicação continue funcionando (fila, triggers, portal, admin).
 *
 * Quando o cliente configurar o domínio no Resend e ligar EMAIL_ENABLED,
 * o `getEmailProvider()` passa a devolver o provider real do Resend
 * automaticamente — nenhuma tela ou regra de negócio precisa mudar.
 */
export function makeDisabledEmailProvider(reason: string): EmailProvider {
  return {
    name: `disabled:${reason}`,
    async send(msg: EmailMessage): Promise<EmailSendResult> {
      console.log("[email:disabled]", {
        reason,
        to: msg.to,
        subject: msg.subject,
        from: msg.from,
        bytes: msg.html.length,
      });
      return {
        ok: true,
        providerMessageId: `disabled_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
    },
  };
}
