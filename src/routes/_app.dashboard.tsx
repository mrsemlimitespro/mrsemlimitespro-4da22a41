import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Users, Zap, LayoutDashboard, Building2, BarChart3 } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/components/brand";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MR Sem Limite Pro" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 pb-32 px-4">
      {/* Welcome Header */}
      <header className="flex flex-col gap-2 pt-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 w-fit">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Workspace Ativo</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white uppercase tracking-[0.2em]">Dashboard</h1>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">
          Visão geral do sistema de dispatch multicanal
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={MessageSquare} label="Envios Totais" value="0" color="#3b82f6" />
        <KpiCard icon={Zap} label="Instâncias Ativas" value="0" color="#10b981" />
        <KpiCard icon={Users} label="Contatos" value="0" color="#3b82f6" />
        <KpiCard icon={BarChart3} label="Taxa de Sucesso" value="0%" color="#10b981" />
      </div>

      {/* Empty States / Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium p-6 min-h-[300px] flex flex-col justify-center items-center text-center space-y-4">
          <div className="icon-tile size-16 opacity-20">
            <Building2 className="size-8" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Ainda não há instâncias</h3>
            <p className="text-xs text-muted-foreground mt-1">Conecte seu primeiro número WhatsApp para começar.</p>
          </div>
        </div>

        <div className="card-premium p-6 min-h-[300px] flex flex-col justify-center items-center text-center space-y-4">
          <div className="icon-tile size-16 opacity-20">
            <Zap className="size-8" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Nenhuma campanha ativa</h3>
            <p className="text-xs text-muted-foreground mt-1">Seus disparos agendados aparecerão aqui.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="card-premium p-6 relative overflow-hidden group">
      <div 
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 blur-3xl transition-opacity group-hover:opacity-20"
        style={{ background: color }}
      />
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <div className="icon-tile size-10" style={{ ["--tile-color" as any]: color }}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-black text-white">{value}</div>
    </div>
  );
}
