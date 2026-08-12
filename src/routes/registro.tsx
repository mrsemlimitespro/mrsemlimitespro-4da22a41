import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, inputCls, primaryBtn } from "./login";
import { PasswordInput, SocialSignIn } from "@/components/auth-extras";

export const Route = createFileRoute("/registro")({
  head: () => ({
    meta: [
      { title: "Criar conta — MR sem limites" },
      { name: "description", content: "Crie sua conta gratuita e acesse Prompts, Agents e Packs premium." },
    ],
  }),
  component: RegistroPage,
});

const registroSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome completo").max(120),
    email: z.string().trim().email("E-mail inválido").max(255),
    telefone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .refine((v) => !v || /^[+()\d\s-]{8,}$/.test(v), "Telefone inválido"),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

function RegistroPage() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = registroSchema.safeParse({ nome, email, telefone, password, confirm });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);

    const emailRedirectTo = window.location.origin;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { nome, telefone },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Se auto-confirm desativado o usuário pode não ter sessão. Tenta login.
    if (!data.session) {
      const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
      if (siErr) {
        setLoading(false);
        setError("Cadastro criado. Confirme o e-mail e faça login.");
        return;
      }
    }

    // Cadastro público cria CLIENTE FINAL.
    // O registro em `clientes` é criado automaticamente pelo trigger
    // `tg_auth_user_to_cliente` no auth.users. Nenhum perfil de revendedor
    // é criado aqui — o upgrade para revendedor é feito em /quero-ser-revendedor.
    console.log("[Auth] cadastro criado como cliente — redirecionando para Home");
    navigate({ to: "/" });
  }

  return (
    <AuthShell>
      <h1 className="mb-4 text-lg font-semibold">Criar conta</h1>
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Field label="Nome">
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="E-mail">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
        </Field>
        <Field label="Telefone">
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className={inputCls}
            inputMode="tel"
          />
        </Field>
        <Field label="Senha">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar senha">
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Criando..." : "Criar conta"}
        </button>
        <SocialSignIn mode="signup" />
        <p className="text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-foreground underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
