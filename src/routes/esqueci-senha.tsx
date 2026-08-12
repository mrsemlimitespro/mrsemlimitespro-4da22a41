import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, inputCls, primaryBtn } from "./login";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — MR sem limites" },
      { name: "description", content: "Recupere o acesso à sua conta." },
    ],
  }),
  component: EsqueciSenhaPage,
});

function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <AuthShell>
      <h1 className="mb-1 text-lg font-semibold">Recuperar senha</h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Enviaremos um link para redefinir sua senha.
      </p>
      {sent ? (
        <div className="space-y-3 text-sm">
          <p className="text-foreground">
            Link enviado para <b>{email}</b>. Verifique sua caixa de entrada.
          </p>
          <Link to="/login" className="block text-center text-xs text-muted-foreground underline">
            Voltar para entrar
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-mail">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              autoComplete="email"
            />
          </Field>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? "Enviando..." : "Enviar link"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/login" className="text-foreground underline">
              Voltar
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
