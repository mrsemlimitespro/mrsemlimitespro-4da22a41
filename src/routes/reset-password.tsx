import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, primaryBtn } from "./login";
import { PasswordInput } from "@/components/auth-extras";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir nova senha — MR sem limites" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Senha deve ter no mínimo 6 caracteres");
    if (password !== confirm) return setError("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    navigate({ to: "/login" });
  }

  return (
    <AuthShell>
      <h1 className="mb-4 text-lg font-semibold">Nova senha</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nova senha">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar senha">
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" className="text-foreground underline">
            Voltar para entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
