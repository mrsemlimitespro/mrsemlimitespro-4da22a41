/**
 * Worker de envio da fila de emails.
 *
 * Endpoint POST em /api/public/hooks/email-worker.
 * Autenticação: header apikey = anon/publishable key do projeto (mesmo padrão
 * usado nos jobs pg_cron existentes).
 *
 * Processa até 20 emails "pending" com scheduled_for <= now(), envia via
 * provider ativo e atualiza status/logs. Retry exponencial (attempts ^ 2
 * minutos) até max_attempts.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getEmailProvider } from "@/lib/email";

type QueueRow = {
  id: string;
  destinatario: string;
  destinatario_nome: string | null;
  assunto: string;
  html: string;
  texto: string | null;
  attempts: number;
  max_attempts: number;
};

export const Route = createFileRoute("/api/public/hooks/email-worker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || key !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        // Config: flag EMAIL_ENABLED + remetente. Enquanto EMAIL_ENABLED=false
        // (padrão), o provider real é substituído pelo DisabledEmailProvider,
        // que apenas registra um log — nenhum email real é enviado.
        // Basta ligar a flag (e configurar EMAIL_FROM no admin) quando o
        // domínio for verificado no Resend; nenhuma outra parte muda.
        const { data: cfg } = await admin
          .from("admin_settings")
          .select(
            "email_enabled,email_from,email_remetente_nome,email_remetente_endereco",
          )
          .limit(1)
          .maybeSingle();

        const emailEnabled = ((cfg as any)?.email_enabled ?? false) === true;
        const provider = getEmailProvider({ enabled: emailEnabled });

        // Remetente: prioriza EMAIL_FROM (definido quando o domínio estiver
        // pronto). Cai para env var e depois para o par nome/endereço legado.
        const envFrom = process.env.EMAIL_FROM;
        const dbFrom = (cfg as any)?.email_from as string | null | undefined;
        const fromName = (cfg as any)?.email_remetente_nome || "MR sem Limites";
        const fromAddr =
          (cfg as any)?.email_remetente_endereco || "contato@mrsemlimites.com";
        const from =
          (dbFrom && dbFrom.trim()) ||
          (envFrom && envFrom.trim()) ||
          `${fromName} <${fromAddr}>`;

        // Marca lote como "sending" atomicamente-ish
        const { data: batch } = await admin
          .from("email_queue")
          .select("id,destinatario,destinatario_nome,assunto,html,texto,attempts,max_attempts")
          .eq("status", "pending")
          .lte("scheduled_for", new Date().toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(20);

        const rows = (batch ?? []) as QueueRow[];
        if (rows.length === 0) {
          return Response.json({ ok: true, processed: 0, provider: provider.name });
        }

        const ids = rows.map((r) => r.id);
        await admin.from("email_queue").update({ status: "sending" }).in("id", ids);

        let sent = 0;
        let failed = 0;

        for (const r of rows) {
          try {
            const res = await provider.send({
              from,
              to: r.destinatario,
              toName: r.destinatario_nome ?? undefined,
              subject: r.assunto,
              html: r.html,
              text: r.texto ?? undefined,
            });
            if (res.ok) {
              await admin
                .from("email_queue")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  provider_message_id: res.providerMessageId ?? null,
                  last_error: null,
                })
                .eq("id", r.id);
              await admin.from("email_logs").insert({
                queue_id: r.id,
                evento: "sent",
                detalhes: { provider: provider.name, id: res.providerMessageId },
              });
              sent++;
            } else {
              throw new Error(res.error ?? "unknown");
            }
          } catch (err: any) {
            failed++;
            const attempts = (r.attempts ?? 0) + 1;
            const shouldRetry = attempts < (r.max_attempts ?? 5);
            const backoffMin = Math.min(60, attempts * attempts); // 1,4,9,16,25 min
            const nextRun = new Date(Date.now() + backoffMin * 60_000).toISOString();
            await admin
              .from("email_queue")
              .update({
                status: shouldRetry ? "pending" : "failed",
                attempts,
                last_error: String(err?.message ?? err).slice(0, 500),
                scheduled_for: shouldRetry ? nextRun : new Date().toISOString(),
              })
              .eq("id", r.id);
            await admin.from("email_logs").insert({
              queue_id: r.id,
              evento: "failed",
              detalhes: { attempts, error: String(err?.message ?? err).slice(0, 500) },
            });
          }
        }

        return Response.json({ ok: true, processed: rows.length, sent, failed });
      },
    },
  },
});
