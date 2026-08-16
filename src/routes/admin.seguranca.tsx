import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAdminGate } from "@/components/admin-password-gate";

export const Route = createFileRoute("/admin/seguranca")({
  component: SegurancaPage,
});

function SegurancaPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 4) return toast.error("Senha muito curta (mínimo 4 caracteres).");
    if (next !== confirm) return toast.error("As senhas não coincidem.");
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("set_admin_password", {
        _new_password: next,
        _current_password: current,
      });
      if (error) throw error;
      toast.success("Senha atualizada. Faça login novamente.");
      clearAdminGate();
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar senha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sistema</div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Segurança</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Altere a senha do administrador. Após salvar, o painel será bloqueado e você precisará
          entrar novamente.
        </p>
      </header>

      <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-6">
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200/90">
          <ShieldAlert className="size-4 shrink-0" />
          Escolha uma senha forte. Ela protege todo o painel administrativo.
        </div>

        <div>
          <Label htmlFor="cur">Senha atual</Label>
          <Input
            id="cur"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="new">Nova senha</Label>
          <Input
            id="new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={4}
            required
          />
        </div>
        <div>
          <Label htmlFor="conf">Confirmar nova senha</Label>
          <Input
            id="conf"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={4}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="gradient-primary" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Save className="size-4" /> Atualizar senha
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
