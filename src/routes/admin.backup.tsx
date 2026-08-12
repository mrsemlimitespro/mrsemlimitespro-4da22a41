import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, DatabaseBackup, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { resources } from "@/lib/admin/resources";

export const Route = createFileRoute("/admin/backup")({
  component: BackupPage,
});

function BackupPage() {
  const [busy, setBusy] = useState(false);

  async function exportAll() {
    setBusy(true);
    try {
      const dump: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        source: "MR Lova admin",
      };
      for (const r of resources) {
        const { data, error } = await (supabase as any).from(r.table).select("*");
        if (error) throw error;
        dump[r.table] = data ?? [];
      }
      const { data: settings } = await (supabase as any)
        .from("admin_settings")
        .select(
          "id, site_name, logo_url, favicon_url, primary_color, accent_color, welcome_text, footer_text, notification_message, notification_active",
        );
      dump["admin_settings"] = settings ?? [];

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mrlova-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar backup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sistema</div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Backup</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exporte um snapshot completo dos dados do sistema em formato JSON.
        </p>
      </header>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 place-items-center rounded-xl gradient-primary">
            <DatabaseBackup className="size-6 text-white" />
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold">Exportar todos os dados</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Inclui: {resources.map((r) => r.label).join(", ")} e configurações do sistema.
            </p>
            <Button className="mt-4 gradient-primary" onClick={exportAll} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Download className="size-4" /> Baixar backup (.json)
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
