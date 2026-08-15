import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { ArrowRight, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { BRAND_LOGO_URL, BRAND_NAME } from "@/components/brand";
import { useIsAuthed } from "@/hooks/useIsAuthed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MR Sem Limite Pro — Dispatch Multicanal & Automação" },
      { name: "description", content: "A plataforma definitiva de automação multicanal para empresas de alta performance." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const authed = useIsAuthed();

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-20 pb-40 px-4 md:space-y-32">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center gap-8 py-20 text-center md:py-32">
        <div className="relative group transition-transform duration-500 hover:scale-105 w-[280px] md:w-[320px]">
          <img src={BRAND_LOGO_URL} alt={BRAND_NAME} className="w-full drop-shadow-glow" />
          <div className="absolute -inset-4 bg-primary/10 blur-[100px] -z-10 rounded-full animate-pulse" />
        </div>

        <div className="space-y-6 max-w-4xl">
          <h1 className="text-5xl font-black md:text-7xl uppercase tracking-[0.2em] text-white leading-tight">
            DISPATCH <span className="gradient-text">MULTICANAL</span>
          </h1>
          <p className="text-sm md:text-lg font-medium text-muted-foreground uppercase tracking-[0.3em] opacity-80 max-w-2xl mx-auto">
            Automação • Produtividade • Resultados
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            {authed ? (
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
                Acessar Painel <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
                  Começar Agora <ArrowRight className="size-4" />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/10">
                  Ver Demonstração
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid gap-6 md:grid-cols-3">
        <FeatureCard 
          icon={MessageSquare} 
          title="Múltiplas Instâncias" 
          description="Gerencie centenas de números WhatsApp em um único workspace isolado."
        />
        <FeatureCard 
          icon={Zap} 
          title="Disparos Inteligentes" 
          description="Filas de processamento em tempo real com agendamento e logs forenses."
        />
        <FeatureCard 
          icon={ShieldCheck} 
          title="Isolamento Absoluto" 
          description="Segurança de nível empresarial com workspaces e RLS multitenant."
        />
      </section>

      {/* Footer Simples */}
      <footer className="text-center py-10 opacity-40 text-[10px] uppercase tracking-[0.4em]">
        © {new Date().getFullYear()} {BRAND_NAME} • Todos os direitos reservados
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="card-premium p-8 space-y-4 group hover:border-primary/50 transition-colors">
      <div className="icon-tile size-14">
        <Icon className="size-6" />
      </div>
      <h3 className="text-lg font-bold uppercase tracking-widest text-white">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
