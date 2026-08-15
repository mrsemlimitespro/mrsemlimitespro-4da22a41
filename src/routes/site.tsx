import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Smartphone, Zap, ShieldCheck, Globe, LayoutDashboard, CheckCircle2, MessageSquare, Layers } from "lucide-react";
import { BrandWatermark } from "@/components/brand";

export const Route = createFileRoute("/site")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030407] text-[#f8fafc] selection:bg-blue-500/30 overflow-x-hidden font-sans">
      <BrandWatermark />
      
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/5 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/30 bg-black/50 p-1 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <img src="/manus-storage/pasted_file_plOH3B_image_24bba903.png" alt="MR Logo" className="h-full w-full rounded-lg object-cover" />
          </div>
          <div>
            <span className="block text-sm font-black tracking-widest text-white leading-none">MR SOCIAL CLOUD</span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-blue-400">DISPATCH MULTICANAL</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Entrar</Button>
          </Link>
          <Link to="/">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white border-none shadow-[0_0_20px_rgba(59,130,246,0.4)] px-6">
              Acessar Painel
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Zap className="h-3 w-3 text-blue-400 fill-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Nova Geração de Automação</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
          Acelere seu Crescimento com <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Dispatch Multicanal</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
          Centralize sua operação de vendas e suporte. Gerencie múltiplos WhatsApps, extraia leads qualificados e automatize disparos inteligentes com tecnologia anti-block de ponta.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white h-14 px-8 text-lg font-bold group shadow-[0_0_30px_rgba(59,130,246,0.5)]">
              Começar Agora
              <Zap className="ml-2 h-5 w-5 fill-white group-hover:animate-pulse" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-white/10 bg-white/5 text-white h-14 px-8 text-lg hover:bg-white/10">
            Ver Demonstração
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Smartphone}
            title="Multi-WhatsApp"
            description="Conecte e gerencie dezenas de instâncias oficiais do WhatsApp em um único workspace isolado."
            color="blue"
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Smart API Anti-Block"
            description="Lógica avançada de rotação de números e intervalos humanos para proteger suas contas contra banimentos."
            color="emerald"
          />
          <FeatureCard 
            icon={Globe}
            title="Extração Global"
            description="Busque leads diretamente do Google Maps por nicho e localização, enviando-os para o funil instantaneamente."
            color="cyan"
          />
        </div>
      </section>

      {/* Secondary Features */}
      <section className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Controle Total da sua Operação</h2>
            <div className="space-y-6">
              <CheckItem title="Workspaces Isolados" description="Separe suas empresas e clientes com segurança absoluta de dados e membros." />
              <CheckItem title="Filas em Tempo Real" description="Acompanhe cada mensagem enviada, entregue ou falha com logs detalhados." />
              <CheckItem title="Webhooks & API" description="Integre com n8n, Make ou qualquer CRM via webhooks de eventos em tempo real." />
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" />
            <div className="relative rounded-2xl border border-white/10 bg-[#070910] p-6 shadow-2xl overflow-hidden">
               <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                  <LayoutDashboard className="h-5 w-5 text-blue-400" />
                  <span className="font-bold text-sm tracking-widest uppercase">Dashboard Overview</span>
               </div>
               <div className="space-y-3">
                 <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full w-[70%] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="h-20 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-blue-400">1.2k</span>
                      <span className="text-[9px] uppercase tracking-tighter text-slate-500">Enviados</span>
                   </div>
                   <div className="h-20 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-emerald-400">98%</span>
                      <span className="text-[9px] uppercase tracking-tighter text-slate-500">Sucesso</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 px-6 text-center text-slate-500 text-sm">
        <p>&copy; 2026 MR Social Cloud &bull; MR Sem Limite Pro &bull; Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }: any) {
  const colors: any = {
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    cyan: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
  };
  
  return (
    <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-colors group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border ${colors[color]} group-hover:scale-110 transition-transform`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}

function CheckItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 mt-1">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </div>
      <div>
        <h4 className="font-bold text-white text-sm">{title}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
