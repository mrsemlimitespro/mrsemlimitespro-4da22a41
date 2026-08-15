import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Login — MR Sem Limite Pro" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={handleLogin} className="card-premium p-8 w-full max-w-md space-y-6">
        <h1 className="text-2xl font-black text-center uppercase tracking-widest text-white">Entrar</h1>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface border border-border px-4 py-3 rounded-lg outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface border border-border px-4 py-3 rounded-lg outline-none focus:border-primary"
          />
        </div>
        <button className="w-full bg-primary py-3 rounded-lg font-bold text-white shadow-glow hover:opacity-90">
          Entrar
        </button>
      </form>
    </div>
  );
}
