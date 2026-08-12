import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Copy, Check, Play, Volume2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sons")({
  head: () => ({
    meta: [{ title: "Catálogo de Sons — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SonsPage,
});

type SoundDef = {
  id: string;
  nome: string;
  descricao: string;
  play: (ctx: AudioContext) => void;
};

// ---------- helpers ----------
function tone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.25,
  when = 0,
  glideTo?: number,
) {
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ctx: AudioContext, dur: number, gain = 0.2, when = 0, lowpass = 2000) {
  const t0 = ctx.currentTime + when;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filt).connect(g).connect(ctx.destination);
  src.start(t0);
}

// ---------- 18 SOUNDS ----------
const SOUNDS: SoundDef[] = [
  {
    id: "click",
    nome: "Click",
    descricao: "Clique curto e limpo para botões.",
    play: (c) => tone(c, 900, 0.05, "square", 0.15),
  },
  {
    id: "pop",
    nome: "Pop",
    descricao: "Pop de bolha, suave.",
    play: (c) => tone(c, 400, 0.12, "sine", 0.3, 0, 900),
  },
  {
    id: "ding",
    nome: "Ding",
    descricao: "Sino curto de confirmação.",
    play: (c) => {
      tone(c, 1568, 0.4, "sine", 0.25);
      tone(c, 2093, 0.4, "sine", 0.15, 0.01);
    },
  },
  {
    id: "success",
    nome: "Success",
    descricao: "Acorde ascendente de sucesso.",
    play: (c) => {
      tone(c, 523, 0.15, "triangle", 0.25);
      tone(c, 659, 0.15, "triangle", 0.25, 0.1);
      tone(c, 784, 0.3, "triangle", 0.25, 0.2);
    },
  },
  {
    id: "error",
    nome: "Error",
    descricao: "Buzzer descendente de erro.",
    play: (c) => {
      tone(c, 300, 0.15, "sawtooth", 0.2);
      tone(c, 200, 0.25, "sawtooth", 0.2, 0.12);
    },
  },
  {
    id: "notification",
    nome: "Notification",
    descricao: "Bip duplo para notificações.",
    play: (c) => {
      tone(c, 880, 0.1, "sine", 0.25);
      tone(c, 1320, 0.15, "sine", 0.25, 0.12);
    },
  },
  {
    id: "coin",
    nome: "Coin",
    descricao: "Moeda 8-bit clássica.",
    play: (c) => {
      tone(c, 988, 0.08, "square", 0.2);
      tone(c, 1319, 0.2, "square", 0.2, 0.06);
    },
  },
  {
    id: "level-up",
    nome: "Level Up",
    descricao: "Sequência ascendente épica.",
    play: (c) => {
      [523, 659, 784, 1047].forEach((f, i) => tone(c, f, 0.18, "square", 0.2, i * 0.08));
    },
  },
  {
    id: "cash",
    nome: "Cash Register",
    descricao: "Caixa registrando venda.",
    play: (c) => {
      tone(c, 1500, 0.05, "square", 0.3);
      noise(c, 0.15, 0.15, 0.05, 3000);
      tone(c, 1200, 0.1, "square", 0.25, 0.2);
    },
  },
  {
    id: "whoosh",
    nome: "Whoosh",
    descricao: "Passagem rápida (transição).",
    play: (c) => noise(c, 0.4, 0.35, 0, 1500),
  },
  {
    id: "magic",
    nome: "Magic Sparkle",
    descricao: "Brilho mágico com harmônicos.",
    play: (c) => {
      [1200, 1600, 2000, 2400].forEach((f, i) => tone(c, f, 0.25, "sine", 0.12, i * 0.05, f * 1.5));
    },
  },
  {
    id: "tap",
    nome: "Tap",
    descricao: "Toque de dedo, curtíssimo.",
    play: (c) => tone(c, 200, 0.03, "sine", 0.3),
  },
  {
    id: "bell",
    nome: "Bell",
    descricao: "Sino brilhante.",
    play: (c) => {
      tone(c, 1046, 0.8, "sine", 0.2);
      tone(c, 2093, 0.6, "sine", 0.1, 0.01);
      tone(c, 3140, 0.4, "sine", 0.05, 0.02);
    },
  },
  {
    id: "chime",
    nome: "Chime",
    descricao: "Sino tripla nota, elegante.",
    play: (c) => {
      tone(c, 1319, 0.5, "sine", 0.2);
      tone(c, 1568, 0.5, "sine", 0.2, 0.12);
      tone(c, 1976, 0.6, "sine", 0.2, 0.24);
    },
  },
  {
    id: "alert",
    nome: "Alert",
    descricao: "Alerta intermitente.",
    play: (c) => {
      tone(c, 880, 0.12, "square", 0.25);
      tone(c, 660, 0.12, "square", 0.25, 0.14);
      tone(c, 880, 0.12, "square", 0.25, 0.28);
    },
  },
  {
    id: "swipe",
    nome: "Swipe",
    descricao: "Deslize curto.",
    play: (c) => tone(c, 600, 0.15, "sine", 0.2, 0, 200),
  },
  {
    id: "confirm",
    nome: "Confirm",
    descricao: "Confirmação suave (duas notas).",
    play: (c) => {
      tone(c, 784, 0.12, "triangle", 0.25);
      tone(c, 1175, 0.2, "triangle", 0.25, 0.1);
    },
  },
  {
    id: "fire",
    nome: "Fire Crackle",
    descricao: "Crepitar de fogo (promoção).",
    play: (c) => {
      noise(c, 0.5, 0.25, 0, 800);
      [0.1, 0.22, 0.35].forEach((t) =>
        tone(c, 120 + Math.random() * 60, 0.05, "sawtooth", 0.15, t),
      );
    },
  },
];

function SonsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx() {
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  function play(s: SoundDef) {
    try {
      s.play(getCtx());
      setPlayingId(s.id);
      window.setTimeout(() => setPlayingId((v) => (v === s.id ? null : v)), 600);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível tocar o som.");
    }
  }

  function copy(id: string, nome: string) {
    navigator.clipboard.writeText(`Aplica o som "${nome}" (${id})`);
    setCopied(id);
    toast.success(`Copiado: ${nome}`);
    window.setTimeout(() => setCopied((v) => (v === id ? null : v)), 1500);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
          <Volume2 className="size-3.5" /> Catálogo de sons
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Sons disponíveis</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          18 efeitos sonoros procedurais (Web Audio API — sem custo, sem download). Aperte{" "}
          <b>Play</b> para ouvir. Copie o nome e me peça:
          <i> "Aplica o som Success no botão de compra"</i> em qualquer projeto.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOUNDS.map((s, idx) => (
          <div
            key={s.id}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  #{String(idx + 1).padStart(2, "0")}
                </div>
                <div className="truncate text-lg font-bold">{s.nome}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.descricao}</div>
              </div>
              <button
                onClick={() => copy(s.id, s.nome)}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                title="Copiar nome do som"
              >
                {copied === s.id ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => play(s)}
              className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/10 to-orange-400/20 px-4 py-6 text-sm font-semibold transition hover:from-fuchsia-500/30 hover:to-orange-400/30"
            >
              <Play className="size-4" fill="currentColor" />
              <span>Tocar</span>
              {playingId === s.id && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(255,120,200,.35), transparent 60%)",
                    animation: "sonPulse 0.6s ease-out",
                  }}
                />
              )}
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes sonPulse {
          0% { opacity: 0; transform: scale(0.6); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
