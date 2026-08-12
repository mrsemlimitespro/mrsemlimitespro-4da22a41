import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

/**
 * Provider Resend. Usa a API HTTP oficial (https://api.resend.com/emails).
 * Requer o secret RESEND_API_KEY em runtime server-side.
 */
export function makeResendProvider(apiKey: string): EmailProvider {
  return {
    name: "resend",
    async send(msg: EmailMessage): Promise<EmailSendResult> {
      const body = {
        from: msg.toName ? `${msg.from}` : msg.from,
        to: [msg.toName ? `${msg.toName} <${msg.to}>` : msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo,
      };
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { ok: false, error: `resend ${res.status}: ${t.slice(0, 300)}` };
      }
      const json = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, providerMessageId: json.id };
    },
  };
}
