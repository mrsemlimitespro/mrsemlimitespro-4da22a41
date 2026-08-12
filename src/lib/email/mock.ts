import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

/**
 * MockEmailProvider — provider padrão enquanto nenhum serviço real está
 * configurado. Registra no console e marca o email como enviado com sucesso,
 * permitindo validar todo o fluxo (fila, retry, logs, portal, admin) sem
 * depender de infraestrutura externa. Substituir por `makeResendProvider` /
 * SMTP / SES / Mailgun / SendGrid quando o cliente fornecer as credenciais —
 * nenhum outro arquivo do sistema precisa mudar.
 */
export function makeMockEmailProvider(): EmailProvider {
  return {
    name: "mock",
    async send(msg: EmailMessage): Promise<EmailSendResult> {
      // Log estruturado — útil para depurar no server-function-logs.
      console.log("[email:mock]", {
        to: msg.to,
        subject: msg.subject,
        bytes: msg.html.length,
      });
      return {
        ok: true,
        providerMessageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
    },
  };
}
