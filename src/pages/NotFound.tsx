import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030407] selection:bg-cyan-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-600/5 blur-[120px]" />
      </div>

      <Card className="w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5 bg-[#090a10]/80 backdrop-blur-xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 opacity-50" />
        <CardContent className="pt-12 pb-12 text-center">
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl group-hover:bg-cyan-500/40 transition-all duration-500" />
              <AlertCircle className="relative h-20 w-20 text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]" />
            </div>
          </div>

          <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">404</h1>

          <h2 className="text-2xl font-bold text-slate-200 mb-4 tracking-tight">
            Página Não Encontrada
          </h2>

          <p className="text-slate-400 mb-10 leading-relaxed max-w-sm mx-auto">
            O recurso que você procura foi movido, removido ou nunca existiu neste workspace.
          </p>

          <div className="flex justify-center">
            <Link to="/">
              <Button
                className="bg-cyan-600 hover:bg-cyan-500 text-[#030407] font-black px-8 py-6 rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_40px_rgba(0,240,255,0.5)] hover:scale-105"
              >
                <Home className="w-5 h-5 mr-2" />
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

