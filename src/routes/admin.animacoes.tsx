import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/animacoes")({
  head: () => ({
    meta: [
      { title: "Catálogo de Animações — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnimacoesPage,
});

type Style = {
  id: string;
  nome: string;
  descricao: string;
  render: () => React.ReactElement;
};

const STYLES: Style[] = [
  {
    id: "neon-marquee",
    nome: "Neon Marquee",
    descricao: "Esteira infinita com cards de gradiente e glow neon pulsante.",
    render: () => <NeonMarquee />,
  },
  {
    id: "glass-tilt",
    nome: "Glass Tilt",
    descricao: "Cards de vidro fosco com leve tilt 3D no hover.",
    render: () => <GlassTilt />,
  },
  {
    id: "gradient-flow",
    nome: "Gradient Flow",
    descricao: "Fundo com gradiente colorido que se move suavemente em loop.",
    render: () => <GradientFlow />,
  },
  {
    id: "shimmer-sweep",
    nome: "Shimmer Sweep",
    descricao: "Faixa de luz atravessando o elemento (efeito holográfico).",
    render: () => <ShimmerSweep />,
  },
  {
    id: "pulse-glow",
    nome: "Pulse Glow",
    descricao: "Botão/ícone com halo pulsando (chama atenção sem distrair).",
    render: () => <PulseGlow />,
  },
  {
    id: "float-orb",
    nome: "Float Orb",
    descricao: "Blobs coloridos flutuando lentamente no fundo (aurora).",
    render: () => <FloatOrb />,
  },
  {
    id: "flip-card",
    nome: "Flip Card",
    descricao: "Card gira 180° no hover, revelando o verso.",
    render: () => <FlipCard />,
  },
  {
    id: "reveal-up",
    nome: "Reveal Up",
    descricao: "Elemento sobe e aparece ao entrar na tela.",
    render: () => <RevealUp />,
  },
  {
    id: "count-up",
    nome: "Count Up",
    descricao: "Números animando de 0 até o valor final.",
    render: () => <CountUp />,
  },
  {
    id: "typewriter",
    nome: "Typewriter",
    descricao: "Texto digitando letra por letra com cursor piscando.",
    render: () => <Typewriter />,
  },
  {
    id: "aurora-hero",
    nome: "Aurora Hero",
    descricao: "Hero com auroras coloridas em movimento (topo de página).",
    render: () => <AuroraHero />,
  },
  {
    id: "particles-soft",
    nome: "Particles Soft",
    descricao: "Partículas leves subindo (chuva de brilho).",
    render: () => <ParticlesSoft />,
  },
  {
    id: "morph-blob",
    nome: "Morph Blob",
    descricao: "Blob colorido mudando de forma continuamente.",
    render: () => <MorphBlob />,
  },
  {
    id: "border-scan",
    nome: "Border Scan",
    descricao: "Linha de luz correndo pela borda do card.",
    render: () => <BorderScan />,
  },
  {
    id: "hover-scale",
    nome: "Hover Scale",
    descricao: "Card cresce e ilumina no hover — clássico e limpo.",
    render: () => <HoverScale />,
  },
  {
    id: "stagger-list",
    nome: "Stagger List",
    descricao: "Lista aparece item por item em cascata.",
    render: () => <StaggerList />,
  },
  {
    id: "gradient-text",
    nome: "Gradient Text",
    descricao: "Título com gradiente animado atravessando as letras.",
    render: () => <GradientText />,
  },
  {
    id: "spotlight",
    nome: "Spotlight",
    descricao: "Foco de luz seguindo o cursor sobre o card.",
    render: () => <Spotlight />,
  },
  // ===== NOVOS 20 =====
  {
    id: "rgb-glow",
    nome: "RGB Glow",
    descricao: "Borda arco-íris girando ao redor do card, brilho forte.",
    render: () => <RgbGlow />,
  },
  {
    id: "confetti-rain",
    nome: "Confetti Rain",
    descricao: "Confetes coloridos caindo continuamente.",
    render: () => <ConfettiRain />,
  },
  {
    id: "laser-scan",
    nome: "Laser Scan",
    descricao: "Feixe de laser vermelho varrendo a área.",
    render: () => <LaserScan />,
  },
  {
    id: "cyber-grid",
    nome: "Cyber Grid",
    descricao: "Grade neon estilo synthwave em perspectiva.",
    render: () => <CyberGrid />,
  },
  {
    id: "matrix-rain",
    nome: "Matrix Rain",
    descricao: "Chuva de caracteres verdes estilo Matrix.",
    render: () => <MatrixRain />,
  },
  {
    id: "fire-glow",
    nome: "Fire Glow",
    descricao: "Chamas laranjas pulsando na base.",
    render: () => <FireGlow />,
  },
  {
    id: "ice-shine",
    nome: "Ice Shine",
    descricao: "Cristal azul com brilho gelado atravessando.",
    render: () => <IceShine />,
  },
  {
    id: "rainbow-wave",
    nome: "Rainbow Wave",
    descricao: "Onda arco-íris ondulando horizontalmente.",
    render: () => <RainbowWave />,
  },
  {
    id: "star-burst",
    nome: "Star Burst",
    descricao: "Raios saindo do centro em explosão colorida.",
    render: () => <StarBurst />,
  },
  {
    id: "electric-arc",
    nome: "Electric Arc",
    descricao: "Arcos elétricos pulsando entre dois pontos.",
    render: () => <ElectricArc />,
  },
  {
    id: "hologram",
    nome: "Hologram",
    descricao: "Efeito holográfico com scanlines e RGB shift.",
    render: () => <Hologram />,
  },
  {
    id: "bubble-pop",
    nome: "Bubble Pop",
    descricao: "Bolhas coloridas subindo e estourando.",
    render: () => <BubblePop />,
  },
  {
    id: "neon-heart",
    nome: "Neon Heart",
    descricao: "Coração neon pulsando com batida.",
    render: () => <NeonHeart />,
  },
  {
    id: "disco-ball",
    nome: "Disco Ball",
    descricao: "Reflexos coloridos girando estilo discoteca.",
    render: () => <DiscoBall />,
  },
  {
    id: "vortex",
    nome: "Vortex",
    descricao: "Espiral colorida sugando pro centro.",
    render: () => <Vortex />,
  },
  {
    id: "glitch-text",
    nome: "Glitch Text",
    descricao: "Texto com glitch RGB estilo cyberpunk.",
    render: () => <GlitchText />,
  },
  {
    id: "neon-sign",
    nome: "Neon Sign",
    descricao: "Placa neon piscando estilo bar/motel.",
    render: () => <NeonSign />,
  },
  {
    id: "rainbow-orbit",
    nome: "Rainbow Orbit",
    descricao: "Bolinhas coloridas orbitando em círculo.",
    render: () => <RainbowOrbit />,
  },
  {
    id: "shockwave",
    nome: "Shockwave",
    descricao: "Ondas de choque expandindo continuamente.",
    render: () => <Shockwave />,
  },
  {
    id: "candy-stripes",
    nome: "Candy Stripes",
    descricao: "Listras coloridas em movimento diagonal.",
    render: () => <CandyStripes />,
  },
];

function buildSnippet(s: Style): string {
  const componentCode = s.render.toString();
  // Tenta extrair a referência do componente demo (ex: <NeonMarquee />)
  const match = componentCode.match(/<(\w+)\s*\/>/);
  const compName = match?.[1];
  // Procura a definição completa da função demo no bundle
  let demoSource = "";
  if (compName) {
    const fn = (globalThis as unknown as Record<string, unknown>)[compName];
    if (typeof fn === "function") demoSource = fn.toString();
  }
  return [
    `// Estilo: ${s.nome} (${s.id})`,
    `// ${s.descricao}`,
    "",
    demoSource || componentCode,
    "",
    "/* Cole também os @keyframes/utilitários necessários do DEMO_CSS em src/routes/admin.animacoes.tsx */",
  ].join("\n");
}

function AnimacoesPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (s: Style) => {
    const text = buildSnippet(s);
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(s.id);
      toast.success(`Código copiado: "${s.nome}"`);
      setTimeout(() => setCopied(null), 1500);
    } else {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
      window.prompt("Copie o código:", text);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="size-3.5" /> Catálogo Privado
        </div>
        <h1 className="text-3xl font-bold">
          <span className="gradient-text-warm">Animações disponíveis</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Todos os estilos que sei aplicar. Cada card tem um <b>nome</b> — copie e me peça:{" "}
          <i>"Aplica o estilo Neon Marquee no carrossel"</i> ou
          <i> "Usa Aurora Hero na home do outro projeto"</i>.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {STYLES.map((s, idx) => (
          <div
            key={s.id}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  #{String(idx + 1).padStart(2, "0")}
                </div>
                <div className="text-lg font-bold">{s.nome}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.descricao}</div>
              </div>
              <button
                type="button"
                onClick={() => copy(s)}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                title="Copiar código da animação"
                aria-label={`Copiar ${s.nome}`}
              >
                {copied === s.id ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
            <div className="relative h-40 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {s.render()}
            </div>
          </div>
        ))}
      </div>

      <style>{DEMO_CSS}</style>
    </div>
  );
}

/* ---------- Demos ---------- */

function NeonMarquee() {
  const items = [
    { g: "from-fuchsia-500 to-orange-400", c: "255,60,180" },
    { g: "from-violet-500 to-cyan-400", c: "80,120,255" },
    { g: "from-emerald-400 to-cyan-400", c: "40,240,200" },
    { g: "from-amber-400 to-red-500", c: "255,140,40" },
    { g: "from-indigo-500 to-pink-500", c: "200,80,255" },
  ];
  const track = [...items, ...items];
  return (
    <div className="flex h-full items-center overflow-hidden">
      <div
        className="flex gap-3 whitespace-nowrap"
        style={{ animation: "marq 14s linear infinite", width: "max-content" }}
      >
        {track.map((it, i) => (
          <div
            key={i}
            className={`h-16 w-28 shrink-0 rounded-lg bg-gradient-to-br ${it.g}`}
            style={{
              boxShadow: `0 0 0 2px rgba(${it.c},.9), 0 0 18px rgba(${it.c},.7), 0 0 32px rgba(${it.c},.5)`,
              animation: `neonp 2.2s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function GlassTilt() {
  return (
    <div className="grid h-full place-items-center perspective-[900px]">
      <div className="tilt h-24 w-40 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl" />
    </div>
  );
}

function GradientFlow() {
  return (
    <div
      className="h-full w-full"
      style={{
        background: "linear-gradient(120deg,#ff3ea5,#7a5cff,#3ec8ff,#3effa5,#ff3ea5)",
        backgroundSize: "300% 300%",
        animation: "flow 8s ease infinite",
      }}
    />
  );
}

function ShimmerSweep() {
  return (
    <div className="grid h-full place-items-center">
      <div className="relative h-20 w-52 overflow-hidden rounded-xl bg-white/5 border border-white/10">
        <div
          className="absolute inset-y-0 -left-1/2 w-1/2"
          style={{
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
            animation: "sweep 2s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

function PulseGlow() {
  return (
    <div className="grid h-full place-items-center">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full bg-fuchsia-500/60 blur-xl"
          style={{ animation: "pg 1.6s ease-in-out infinite" }}
        />
        <div className="relative size-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-400 shadow-2xl" />
      </div>
    </div>
  );
}

function FloatOrb() {
  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="absolute size-24 rounded-full bg-fuchsia-500/50 blur-2xl"
        style={{ top: "10%", left: "10%", animation: "orb1 6s ease-in-out infinite" }}
      />
      <div
        className="absolute size-24 rounded-full bg-cyan-500/50 blur-2xl"
        style={{ top: "40%", left: "50%", animation: "orb2 7s ease-in-out infinite" }}
      />
      <div
        className="absolute size-24 rounded-full bg-violet-500/50 blur-2xl"
        style={{ top: "20%", right: "10%", animation: "orb3 8s ease-in-out infinite" }}
      />
    </div>
  );
}

function FlipCard() {
  return (
    <div className="grid h-full place-items-center perspective-[900px]">
      <div className="flip h-24 w-36 [transform-style:preserve-3d]">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 [backface-visibility:hidden] grid place-items-center text-white font-bold">
          FRENTE
        </div>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 [transform:rotateY(180deg)] [backface-visibility:hidden] grid place-items-center text-white font-bold">
          VERSO
        </div>
      </div>
    </div>
  );
}

function RevealUp() {
  return (
    <div className="grid h-full place-items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-4 w-40 rounded bg-gradient-to-r from-cyan-400 to-violet-500"
          style={{ animation: `revup 2.5s ease-out ${i * 0.3}s infinite` }}
        />
      ))}
    </div>
  );
}

function CountUp() {
  return (
    <div className="grid h-full place-items-center">
      <div
        className="text-5xl font-black tabular-nums"
        style={{ animation: "cu 3s steps(30) infinite" }}
      >
        <span className="gradient-text-warm">1.284</span>
      </div>
    </div>
  );
}

function Typewriter() {
  return (
    <div className="grid h-full place-items-center">
      <div className="font-mono text-sm text-emerald-300">
        <span className="typew">criando magia...</span>
        <span
          className="ml-0.5 inline-block h-4 w-0.5 bg-emerald-300 align-middle"
          style={{ animation: "cursor 1s steps(1) infinite" }}
        />
      </div>
    </div>
  );
}

function AuroraHero() {
  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(600px at 20% 30%, rgba(255,60,180,.5), transparent 60%), radial-gradient(500px at 80% 60%, rgba(80,120,255,.5), transparent 60%), radial-gradient(400px at 50% 90%, rgba(40,240,200,.4), transparent 60%)",
          animation: "flow 10s ease infinite",
          backgroundSize: "200% 200%",
        }}
      />
      <div className="relative grid h-full place-items-center text-white font-black text-xl">
        AURORA
      </div>
    </div>
  );
}

function ParticlesSoft() {
  return (
    <div className="relative h-full overflow-hidden bg-black/40">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute size-1 rounded-full bg-white/80"
          style={{
            left: `${(i * 47) % 100}%`,
            bottom: "-10px",
            animation: `rise ${4 + (i % 5)}s linear ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function MorphBlob() {
  return (
    <div className="grid h-full place-items-center">
      <div
        className="size-24 bg-gradient-to-br from-fuchsia-500 to-cyan-400"
        style={{
          animation: "morph 6s ease-in-out infinite",
          borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
        }}
      />
    </div>
  );
}

function BorderScan() {
  return (
    <div className="grid h-full place-items-center">
      <div className="relative h-24 w-40 rounded-xl bg-black/60">
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0 70%, #ff3ea5 80%, #3ec8ff 90%, transparent 100%)",
            animation: "spin 3s linear infinite",
            padding: "2px",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      </div>
    </div>
  );
}

function HoverScale() {
  return (
    <div className="grid h-full place-items-center">
      <div className="h-20 w-32 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_40px_rgba(40,240,200,0.7)] cursor-pointer" />
    </div>
  );
}

function StaggerList() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-3 w-40 rounded bg-gradient-to-r from-violet-500 to-pink-500"
          style={{ animation: `stag 3s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}

function GradientText() {
  return (
    <div className="grid h-full place-items-center">
      <div
        className="text-3xl font-black bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(90deg,#ff3ea5,#7a5cff,#3ec8ff,#ff3ea5)",
          backgroundSize: "200% 100%",
          animation: "flow 3s linear infinite",
          WebkitBackgroundClip: "text",
        }}
      >
        BRILHANTE
      </div>
    </div>
  );
}

function Spotlight() {
  return (
    <div
      className="relative grid h-full place-items-center bg-black/50"
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--y", `${e.clientY - rect.top}px`);
      }}
      style={{
        backgroundImage:
          "radial-gradient(180px at var(--x,50%) var(--y,50%), rgba(255,60,180,.35), transparent 70%)",
      }}
    >
      <span className="text-sm text-white/70">mova o mouse aqui</span>
    </div>
  );
}

/* ===== NOVOS 20 ===== */

function RgbGlow() {
  return (
    <div className="grid h-full place-items-center">
      <div className="relative h-24 w-40 rounded-xl bg-black overflow-hidden">
        <div
          className="absolute -inset-1"
          style={{
            background:
              "conic-gradient(from 0deg,#ff0080,#ff8c00,#ffee00,#00ff88,#00e5ff,#8a2be2,#ff0080)",
            animation: "spin 3s linear infinite",
            filter: "blur(6px)",
          }}
        />
        <div className="absolute inset-[3px] rounded-[10px] bg-black grid place-items-center text-white font-black">
          RGB
        </div>
      </div>
    </div>
  );
}

function ConfettiRain() {
  const colors = ["#ff3ea5", "#7a5cff", "#3ec8ff", "#3effa5", "#ffee00", "#ff8c00"];
  return (
    <div className="relative h-full overflow-hidden bg-black/60">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute h-2 w-1"
          style={{
            left: `${(i * 37) % 100}%`,
            top: "-10px",
            background: colors[i % colors.length],
            animation: `fall ${2.5 + (i % 5) * 0.4}s linear ${i * 0.15}s infinite`,
            transform: `rotate(${i * 30}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function LaserScan() {
  return (
    <div className="relative h-full overflow-hidden bg-black">
      <div
        className="absolute left-0 right-0 h-0.5 bg-red-500"
        style={{
          boxShadow: "0 0 12px #ff0040, 0 0 24px #ff0040",
          animation: "laser 2s ease-in-out infinite",
        }}
      />
      <div className="grid h-full place-items-center text-red-400 font-mono text-xs">
        SCANNING...
      </div>
    </div>
  );
}

function CyberGrid() {
  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ background: "linear-gradient(180deg,#0a0026 0%, #ff006e 100%)" }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 24px, rgba(0,229,255,.7) 24px 25px), repeating-linear-gradient(0deg, transparent 0 20px, rgba(0,229,255,.7) 20px 21px)",
          transform: "perspective(200px) rotateX(60deg)",
          transformOrigin: "bottom",
          animation: "grid 2s linear infinite",
        }}
      />
    </div>
  );
}

function MatrixRain() {
  const cols = 14;
  return (
    <div className="relative h-full overflow-hidden bg-black font-mono text-emerald-400 text-xs">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: `${(i / cols) * 100}%`,
            animation: `matrix ${2 + (i % 4)}s linear ${i * 0.2}s infinite`,
          }}
        >
          {Array.from({ length: 8 }).map((_, j) => (
            <div key={j} style={{ opacity: 1 - j * 0.12 }}>
              {String.fromCharCode(0x30a0 + ((i * 7 + j) % 96))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FireGlow() {
  return (
    <div className="relative h-full overflow-hidden bg-black">
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, #ffee00 0%, #ff6600 30%, #ff0040 60%, transparent 80%)",
          animation: "fire 1.2s ease-in-out infinite",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}

function IceShine() {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-br from-cyan-900 to-blue-950">
      <div className="relative h-24 w-40 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 shadow-[0_0_40px_rgba(0,229,255,.6)]">
        <div
          className="absolute inset-y-0 -left-full w-full"
          style={{
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)",
            animation: "sweep 2.4s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

function RainbowWave() {
  return (
    <div className="grid h-full place-items-center overflow-hidden">
      <svg viewBox="0 0 200 60" className="w-full">
        <defs>
          <linearGradient id="rw" x1="0" x2="1">
            <stop offset="0" stopColor="#ff0080" />
            <stop offset=".25" stopColor="#ff8c00" />
            <stop offset=".5" stopColor="#ffee00" />
            <stop offset=".75" stopColor="#00ff88" />
            <stop offset="1" stopColor="#00e5ff" />
          </linearGradient>
        </defs>
        <path
          d="M0 30 Q 25 5, 50 30 T 100 30 T 150 30 T 200 30"
          fill="none"
          stroke="url(#rw)"
          strokeWidth="4"
          strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 6px currentColor)",
            animation: "wave 2s linear infinite",
          }}
        />
      </svg>
    </div>
  );
}

function StarBurst() {
  return (
    <div className="relative grid h-full place-items-center bg-black overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute h-16 w-0.5 origin-bottom"
          style={{
            background: `linear-gradient(to top, transparent, hsl(${i * 30},100%,60%))`,
            transform: `rotate(${i * 30}deg) translateY(-30%)`,
            animation: `burst 2s ease-in-out ${i * 0.05}s infinite`,
          }}
        />
      ))}
      <div className="relative size-6 rounded-full bg-white shadow-[0_0_30px_#fff]" />
    </div>
  );
}

function ElectricArc() {
  return (
    <div className="relative grid h-full place-items-center bg-black overflow-hidden">
      <svg viewBox="0 0 200 100" className="w-full">
        <polyline
          points="10,50 40,20 70,60 100,10 130,70 160,30 190,50"
          fill="none"
          stroke="#00e5ff"
          strokeWidth="2"
          style={{
            filter: "drop-shadow(0 0 6px #00e5ff)",
            animation: "arc .18s steps(2) infinite",
          }}
        />
      </svg>
    </div>
  );
}

function Hologram() {
  return (
    <div className="relative h-full overflow-hidden bg-black">
      <div
        className="absolute inset-0 grid place-items-center text-3xl font-black"
        style={{ animation: "holo 3s linear infinite" }}
      >
        HOLO
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,255,255,.15) 0 1px, transparent 1px 3px)",
          animation: "scan 4s linear infinite",
        }}
      />
    </div>
  );
}

function BubblePop() {
  const colors = ["#ff3ea5", "#7a5cff", "#3ec8ff", "#3effa5"];
  return (
    <div className="relative h-full overflow-hidden bg-gradient-to-b from-blue-950 to-black">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${((i * 41) % 90) + 5}%`,
            bottom: "-20px",
            width: 10 + (i % 4) * 6,
            height: 10 + (i % 4) * 6,
            background: `radial-gradient(circle at 30% 30%, #fff, ${colors[i % 4]} 80%)`,
            boxShadow: `0 0 12px ${colors[i % 4]}`,
            animation: `bubble ${3 + (i % 4)}s ease-in ${i * 0.25}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function NeonHeart() {
  return (
    <div className="grid h-full place-items-center bg-black">
      <div
        className="text-6xl"
        style={{
          color: "#ff3ea5",
          textShadow: "0 0 10px #ff3ea5, 0 0 20px #ff3ea5, 0 0 40px #ff3ea5",
          animation: "beat 1s ease-in-out infinite",
        }}
      >
        ♥
      </div>
    </div>
  );
}

function DiscoBall() {
  return (
    <div className="relative h-full overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background:
            "conic-gradient(from 0deg, #ff3ea5, #ffee00, #00ff88, #00e5ff, #7a5cff, #ff3ea5)",
          animation: "spin 4s linear infinite",
          filter: "blur(30px)",
          opacity: 0.7,
        }}
      />
      <div className="relative grid h-full place-items-center">
        <div
          className="size-16 rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 30%, #fff, #888 60%, #333)",
            boxShadow: "0 0 40px #fff",
          }}
        />
      </div>
    </div>
  );
}

function Vortex() {
  return (
    <div className="relative h-full overflow-hidden bg-black grid place-items-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: 30 + i * 22,
            height: 30 + i * 22,
            borderColor: `hsl(${i * 60},100%,60%)`,
            boxShadow: `0 0 12px hsl(${i * 60},100%,60%)`,
            animation: `vortex 3s linear ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function GlitchText() {
  return (
    <div className="grid h-full place-items-center bg-black">
      <div className="relative text-3xl font-black text-white glitch" data-text="GLITCH">
        GLITCH
      </div>
    </div>
  );
}

function NeonSign() {
  return (
    <div className="grid h-full place-items-center bg-black">
      <div
        className="text-2xl font-black tracking-widest"
        style={{
          color: "#ff3ea5",
          textShadow: "0 0 6px #ff3ea5, 0 0 14px #ff3ea5, 0 0 28px #ff0080",
          animation: "flicker 2.5s linear infinite",
        }}
      >
        OPEN 24H
      </div>
    </div>
  );
}

function RainbowOrbit() {
  return (
    <div className="relative grid h-full place-items-center bg-black">
      <div className="relative size-24" style={{ animation: "spin 3s linear infinite" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute size-4 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              background: `hsl(${i * 60},100%,60%)`,
              boxShadow: `0 0 12px hsl(${i * 60},100%,60%)`,
              transform: `translate(-50%,-50%) rotate(${i * 60}deg) translateY(-40px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Shockwave() {
  return (
    <div className="relative grid h-full place-items-center bg-black overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-fuchsia-400"
          style={{
            animation: `shock 2s ease-out ${i * 0.6}s infinite`,
            boxShadow: "0 0 20px #ff3ea5",
          }}
        />
      ))}
      <div className="relative size-4 rounded-full bg-white shadow-[0_0_20px_#fff]" />
    </div>
  );
}

function CandyStripes() {
  return (
    <div
      className="h-full w-full"
      style={{
        background:
          "repeating-linear-gradient(45deg, #ff3ea5 0 20px, #ffee00 20px 40px, #00e5ff 40px 60px, #7a5cff 60px 80px)",
        backgroundSize: "200% 200%",
        animation: "stripes 3s linear infinite",
      }}
    />
  );
}

const DEMO_CSS = `
@keyframes marq { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@keyframes neonp { 0%,100% { filter: brightness(1) saturate(1.2) } 50% { filter: brightness(1.3) saturate(1.6) } }
@keyframes flow { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
@keyframes sweep { 0% { transform: translateX(0) } 100% { transform: translateX(400%) } }
@keyframes pg { 0%,100% { transform: scale(1); opacity: .6 } 50% { transform: scale(1.4); opacity: .2 } }
@keyframes orb1 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(30px,20px) } }
@keyframes orb2 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-40px,-15px) } }
@keyframes orb3 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-20px,25px) } }
@keyframes revup { 0% { opacity: 0; transform: translateY(20px) } 30%,70% { opacity: 1; transform: translateY(0) } 100% { opacity: 0; transform: translateY(-20px) } }
@keyframes cu { 0% { opacity: .4 } 100% { opacity: 1 } }
@keyframes cursor { 50% { opacity: 0 } }
@keyframes rise { 0% { transform: translateY(0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(-180px); opacity: 0 } }
@keyframes morph { 0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40% } 50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60% } }
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes stag { 0%,100% { transform: translateX(-20px); opacity: .3 } 50% { transform: translateX(0); opacity: 1 } }
.tilt { transition: transform .4s ease; }
.tilt:hover { transform: rotateY(15deg) rotateX(8deg) scale(1.05); }
.flip { position: relative; transition: transform .6s; }
.flip:hover { transform: rotateY(180deg); }
.typew { display: inline-block; overflow: hidden; white-space: nowrap; animation: typing 3s steps(16) infinite; }
@keyframes typing { 0%,10% { width: 0 } 60%,100% { width: 100% } }

/* Novos */
@keyframes fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1 } 100% { transform: translateY(200px) rotate(720deg); opacity: 0 } }
@keyframes laser { 0% { top: 0 } 50% { top: 100% } 100% { top: 0 } }
@keyframes grid { from { background-position: 0 0, 0 0 } to { background-position: 0 20px, 24px 0 } }
@keyframes matrix { 0% { transform: translateY(-100%) } 100% { transform: translateY(200%) } }
@keyframes fire { 0%,100% { transform: scaleY(1); opacity: .9 } 50% { transform: scaleY(1.15); opacity: 1 } }
@keyframes wave { 0% { transform: translateX(0) } 100% { transform: translateX(-50px) } }
@keyframes burst { 0%,100% { transform: rotate(var(--r,0)) scaleY(1); opacity: .6 } 50% { transform: rotate(var(--r,0)) scaleY(1.4); opacity: 1 } }
@keyframes arc { 0% { d: path('M10 50 L40 20 L70 60 L100 10 L130 70 L160 30 L190 50') } 50% { transform: translateY(4px) } }
@keyframes holo { 0%,100% { color: #00e5ff; text-shadow: 2px 0 #ff3ea5, -2px 0 #3effa5 } 50% { color: #ff3ea5; text-shadow: -2px 0 #00e5ff, 2px 0 #ffee00 } }
@keyframes scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(100%) } }
@keyframes bubble { 0% { transform: translateY(0) scale(.6); opacity: 0 } 20% { opacity: 1 } 90% { transform: translateY(-140px) scale(1); opacity: 1 } 100% { transform: translateY(-160px) scale(1.4); opacity: 0 } }
@keyframes beat { 0%,100% { transform: scale(1) } 25% { transform: scale(1.2) } 50% { transform: scale(0.95) } 75% { transform: scale(1.15) } }
@keyframes vortex { 0% { transform: rotate(0deg) scale(1); opacity: 1 } 100% { transform: rotate(360deg) scale(.2); opacity: 0 } }
.glitch { position: relative; }
.glitch::before, .glitch::after { content: attr(data-text); position: absolute; inset: 0; }
.glitch::before { color: #ff3ea5; transform: translate(-2px,0); animation: glitch1 2s infinite; mix-blend-mode: screen; }
.glitch::after { color: #00e5ff; transform: translate(2px,0); animation: glitch2 2s infinite; mix-blend-mode: screen; }
@keyframes glitch1 { 0%,100% { clip-path: inset(0 0 80% 0) } 20% { clip-path: inset(20% 0 60% 0) } 40% { clip-path: inset(50% 0 30% 0) } 60% { clip-path: inset(70% 0 10% 0) } }
@keyframes glitch2 { 0%,100% { clip-path: inset(80% 0 0 0) } 20% { clip-path: inset(60% 0 20% 0) } 40% { clip-path: inset(30% 0 50% 0) } 60% { clip-path: inset(10% 0 70% 0) } }
@keyframes flicker { 0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1 } 20%,24%,55% { opacity: .3 } }
@keyframes shock { 0% { width: 10px; height: 10px; opacity: 1 } 100% { width: 200px; height: 200px; opacity: 0 } }
@keyframes stripes { 0% { background-position: 0 0 } 100% { background-position: 200px 200px } }
`;
