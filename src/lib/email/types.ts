/**
 * Contrato genérico de provedor de email (Fase 4).
 * Implementações concretas em: resend, smtp, sendgrid, ses, mailgun.
 */
export type EmailMessage = {
  from: string;
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type EmailSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<EmailSendResult>;
}
