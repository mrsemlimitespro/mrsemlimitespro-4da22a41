/**
 * Tela de troca obrigatória de senha (primeiro acesso do revendedor).
 * Também usada por links de recovery.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordChange } from "@/lib/revendedores/admin.functions";

export const Route = createFileRoute("/_app/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar nova senha — MR Sem Limites" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const nav = useNavigate();
  const complete = useServerFn(completePasswordChange);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      await complete({ data: undefined as never });
      toast.success("Senha atualizada com sucesso!");
      nav({ to: "/revendedor" });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar senha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="glass-strong rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/15 p-2">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Crie sua nova senha</h1>
            <p className="text-xs text-muted-foreground">
              Por segurança, é necessário criar uma senha nova no primeiro acesso.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
            />
          </div>
          <div>
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="gradient-primary w-full"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Salvar nova senha"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
