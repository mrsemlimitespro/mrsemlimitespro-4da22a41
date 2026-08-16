import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Server, 
  CheckCircle2, 
  Globe, 
  Key, 
  Zap, 
  Code2, 
  ShieldCheck,
  ChevronRight,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/api-dashboard")({
  component: ApiDashboard,
});

function ApiDashboard() {
  const endpoints = [
    {
      name: "Validação de Licença",
      path: "/api/public/ext/validate-license",
      method: "POST",
      status: "online",
      description: "Endpoint principal para validação de licenças da extensão.",
      example: JSON.stringify({ license_key: "XXX-YYY", hwid: "DEVICE-123" }, null, 2)
    },
    {
      name: "Comandos (Proxy)",
      path: "/api/public/ext/send-command",
      method: "POST",
      status: "online",
      description: "Processamento de automações e logs da extensão.",
      example: JSON.stringify({ action: "auto_reply", payload: { msg: "oi" } }, null, 2)
    }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <Server className="size-3" /> Infraestrutura
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">API de Controle</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitoramento e documentação técnica dos endpoints para a extensão Chrome.
        </p>
      </header>

      {/* Status Geral */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5 space-y-2 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground">Status do Servidor</div>
          <div className="flex items-center gap-2 text-xl font-bold">
            <CheckCircle2 className="size-5 text-emerald-500" /> ONLINE
          </div>
        </div>
        <div className="glass rounded-2xl p-5 space-y-2">
          <div className="text-xs text-muted-foreground">CORS Policy</div>
          <div className="flex items-center gap-2 text-xl font-bold">
            <Globe className="size-5 text-blue-500" /> PERMISSIVO
          </div>
          <div className="text-[10px] text-muted-foreground">chrome-extension://* permitido</div>
        </div>
        <div className="glass rounded-2xl p-5 space-y-2">
          <div className="text-xs text-muted-foreground">Latência Média</div>
          <div className="flex items-center gap-2 text-xl font-bold">
            <Activity className="size-5 text-orange-500" /> ~45ms
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Code2 className="size-5 text-primary" /> Endpoints Disponíveis
        </h2>
        
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <div key={ep.path} className="glass rounded-2xl p-6 transition-all hover:bg-white/[0.02]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{ep.name}</h3>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500 uppercase">
                      {ep.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-primary">{ep.method}</span>
                    <span className="font-mono text-muted-foreground select-all">{ep.path}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Link 
                    to={ep.path as any} 
                    className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                  >
                    Testar <ChevronRight className="size-3" />
                  </Link>
                </div>
              </div>
              
              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Descrição</p>
                  <p className="text-sm leading-relaxed">{ep.description}</p>
                  <ul className="space-y-1 mt-4">
                    <li className="text-[11px] flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="size-3 text-emerald-500" /> Sem autenticação (Modo Dev)
                    </li>
                    <li className="text-[11px] flex items-center gap-2 text-muted-foreground">
                      <Zap className="size-3 text-orange-500" /> Resposta em tempo real
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Exemplo de Payload</p>
                  <pre className="bg-black/40 rounded-xl p-4 text-[10px] font-mono text-blue-300 overflow-x-auto border border-white/5">
                    {ep.example}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nota técnica */}
      <footer className="glass-strong rounded-2xl p-6 border-l-4 border-l-blue-500">
        <div className="flex items-start gap-4">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Key className="size-5 text-blue-500" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold">Nota Técnica: Backend MR Sem Limites</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estes endpoints foram criados para substituir o backend antigo. O sistema de CORS está configurado para aceitar 
              qualquer requisição vinda de extensões Chrome (<code className="bg-white/5 px-1 rounded">chrome-extension://*</code>). 
              A resposta de validação está no modo "sempre válido" para facilitar o desenvolvimento inicial.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
