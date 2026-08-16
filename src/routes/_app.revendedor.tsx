import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, KeyRound, DollarSign, TrendingUp, AlertCircle,
  Loader2, Coins, FlaskConical, Ban, CalendarClock,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/revendedor")({
  head: () => ({
    meta: [
      { title: "Painel do Revendedor — MR sem Limites" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RevendedorDashboard,
});

type DashKPI = {
  ok: boolean;
  clientes: number;
  licencas_total: number;
  licencas_ativas: number;
  licencas_teste: number;
  licencas_bloqueadas: number;
  licencas_vencendo: number;
  vendas_mes: number;
  receita_mes: number;
  receita_total: number;
  saldo_creditos: number;
  pendencias: number;
};

function RevendedorDashboard() {
  const [kpi, setKpi] = useState<DashKPI | null>(null);
  const [vendas, setVendas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [acessos, setAcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("revendedor_dashboard");
      setKpi(data as DashKPI);

      const [{ data: v }, { data: c }, { data: a }] = await Promise.all([
        supabase
          .from("payment_transactions")
          .select("id,valor,status,metodo,cliente_email,cliente_nome,created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("clientes")
          .select("id,nome,email,created_at,status")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("licencas")
          .select("id,chave,email,ultimo_acesso,status,tipo")
          .not("ultimo_acesso", "is", null)
          .order("ultimo_acesso", { ascending: false })
          .limit(10),
      ]);
      setVendas(v ?? []);
      setClientes(c ?? []);
      setAcessos(a ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!kpi?.ok) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold">Área do revendedor</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta ainda não é revendedora.{" "}
          <Link to="/quero-ser-revendedor" className="gradient-text underline">
            Torne-se revendedor
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Revenda
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text">Painel do Revendedor</span>
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Clientes" value={kpi.clientes} icon={Users} />
        <Kpi label="Licenças ativas" value={kpi.licencas_ativas} icon={KeyRound} />
        <Kpi label="Em teste" value={kpi.licencas_teste} icon={FlaskConical} />
        <Kpi label="Bloqueadas" value={kpi.licencas_bloqueadas} icon={Ban} />
        <Kpi label="Vencendo (7d)" value={kpi.licencas_vencendo} icon={CalendarClock} />
        <Kpi
          label="Vendas do mês"
          value={kpi.vendas_mes}
          hint={`R$ ${money(kpi.receita_mes)}`}
          icon={TrendingUp}
        />
        <Kpi
          label="Receita total"
          value={`R$ ${money(kpi.receita_total)}`}
          icon={DollarSign}
        />
        <Kpi label="Créditos" value={kpi.saldo_creditos} icon={Coins} />
        <Kpi label="Pendências" value={kpi.pendencias} icon={AlertCircle} />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Últimas vendas">
          {vendas.length === 0 ? (
            <Empty msg="Sem vendas recentes." />
          ) : (
            <ul className="divide-y divide-white/5">
              {vendas.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div>{v.cliente_nome || v.cliente_email || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(v.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">R$ {money(v.valor)}</div>
                    <div
                      className={cn(
                        "text-[10px] uppercase tracking-wider",
                        v.status === "aprovado"
                          ? "text-emerald-300"
                          : "text-muted-foreground",
                      )}
                    >
                      {v.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Últimos clientes">
          {clientes.length === 0 ? (
            <Empty msg="Sem clientes recentes." />
          ) : (
            <ul className="divide-y divide-white/5">
              {clientes.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div>{c.nome}</div>
                    <div className="text-[10px] text-muted-foreground">{c.email}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card title="Últimos acessos">
        {acessos.length === 0 ? (
          <Empty msg="Sem acessos recentes." />
        ) : (
          <ul className="divide-y divide-white/5">
            {acessos.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-mono text-xs">{a.chave}</div>
                  <div className="text-[10px] text-muted-foreground">{a.email}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {a.ultimo_acesso ? new Date(a.ultimo_acesso).toLocaleString("pt-BR") : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function money(v: any): string {
  return Number(v ?? 0).toFixed(2).replace(".", ",");
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: any;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="py-6 text-center text-xs text-muted-foreground">{msg}</div>;
}
