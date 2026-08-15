import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Zap, MessageSquare, Bot, ArrowRight, Play } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050B14] text-white selection:bg-emerald-500 selection:text-black">
      {/* Navbar */}
      <header className="border-b border-white/10 bg-[#050B14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-cyan-400/40 bg-black/60 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.35)] overflow-hidden">
              <img src="/manus-storage/mr-social-cloud-logo_b2b2dfb8.png" alt="Logo MR Social Cloud" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                MR SOCIAL CLOUD
              </span>
              <p className="text-xs text-zinc-400">Social Growth & Multicanal</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-300">
            <a href="#recursos" className="hover:text-cyan-400 transition">Recursos</a>
            <a href="#demo" className="hover:text-cyan-400 transition">Demonstração</a>
            <a href="#beneficios" className="hover:text-cyan-400 transition">Vantagens</a>
          </div>
          <div>
            <a href="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold hover:opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                Acessar Painel <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-4 py-1.5 rounded-full text-sm mb-6 inline-flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" /> Plataforma Oficial Multicanal com Instâncias Evolution API
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight mb-8">
            Disparos & Prospecção com <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">Poder Absoluto</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-3xl mx-auto mb-12">
            Gerencie múltiplos números de WhatsApp, campanhas automatizadas, extração de leads do Google Maps e redes sociais em um painel neon exclusivo com isolamento total por empresa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/">
              <Button size="lg" className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-14 px-8 text-base shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                Entrar no Sistema <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <a href="#demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 hover:bg-white/10 text-white h-14 px-8 text-base">
                <Play className="w-4 h-4 mr-2 text-emerald-400" /> Ver Demonstração
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Video Demonstration Section */}
      <section id="demo" className="py-20 border-t border-white/10 bg-black/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Veja a Plataforma em Funcionamento</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Conheça o painel real por dentro. O vídeo público será inserido quando tivermos uma gravação autorizada, sem dados pessoais e com a identidade MR Social Cloud.
            </p>
          </div>
          <div className="relative rounded-2xl border border-cyan-500/30 bg-[#0A101D] p-3 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            <div className="aspect-video w-full rounded-xl bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0,transparent_70%)]" />
              <a href="/" className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400 mb-4 cursor-pointer group-hover:scale-110 transition shadow-[0_0_25px_rgba(6,182,212,0.5)]" aria-label="Abrir painel real">
                <Play className="w-8 h-8 fill-current ml-1" />
              </a>
              <p className="text-zinc-300 font-medium">Painel MR Social Cloud em funcionamento</p>
              <p className="text-xs text-zinc-500 mt-1">Clique para abrir o painel real. O vídeo autorizado será adicionado nesta área.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="recursos" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Recursos Exclusivos para Escalar o seu Negócio</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Arquitetura robusta desenhada para empresas que exigem alta performance, segurança e organização multicanal.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-[#0A101D]/80 border-white/10 hover:border-cyan-500/50 transition duration-300">
            <CardContent className="p-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Múltiplas Instâncias WhatsApp</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Conecte diversos números de WhatsApp por empresa com QR Codes reais via Evolution API. Gerencie status e reconexão sem perder dados.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#0A101D]/80 border-white/10 hover:border-cyan-500/50 transition duration-300">
            <CardContent className="p-8">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Isolamento Multiempresa</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Cada empresa ou cliente possui um ambiente totalmente privado e isolado. Nenhum dado, contato ou campanha é compartilhado entre contas.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#0A101D]/80 border-white/10 hover:border-cyan-500/50 transition duration-300">
            <CardContent className="p-8">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Smart Dispatch Responsável</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Controle de filas, limites configuráveis, opt-out e auditoria para operar de acordo com as regras dos provedores e reduzir riscos operacionais.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 MR Sem Limite Pro. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="/" className="hover:text-cyan-400 transition">Acessar Painel</a>
            <a href="#recursos" className="hover:text-cyan-400 transition">Termos de Uso</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
