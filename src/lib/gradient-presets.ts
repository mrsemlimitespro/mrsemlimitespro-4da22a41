// Presets de gradientes para cards da Loja.
// A chave é o valor salvo em `cor_gradiente` (packs / planos).

export type GradientPreset = {
  key: string;
  gradient: string;
  button: string;
  badge: "light" | "dark";
};

export const GRADIENT_PRESETS: Record<string, GradientPreset> = {
  violet: {
    key: "violet",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)",
    button: "#a855f7",
    badge: "light",
  },
  magenta: {
    key: "magenta",
    gradient: "linear-gradient(135deg, #831843 0%, #db2777 55%, #f472b6 100%)",
    button: "#ec4899",
    badge: "light",
  },
  orange: {
    key: "orange",
    gradient: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fb923c 100%)",
    button: "#f97316",
    badge: "light",
  },
  cyan: {
    key: "cyan",
    gradient: "linear-gradient(135deg, #0e7490 0%, #06b6d4 55%, #67e8f9 100%)",
    button: "#06b6d4",
    badge: "light",
  },
  emerald: {
    key: "emerald",
    gradient: "linear-gradient(135deg, #065f46 0%, #10b981 55%, #6ee7b7 100%)",
    button: "#10b981",
    badge: "light",
  },
  pink: {
    key: "pink",
    gradient: "linear-gradient(135deg, #9d174d 0%, #ec4899 55%, #fbcfe8 100%)",
    button: "#ec4899",
    badge: "light",
  },
  gold: {
    key: "gold",
    gradient: "linear-gradient(135deg, #ca8a04 0%, #f59e0b 45%, #fde047 100%)",
    button: "#f59e0b",
    badge: "dark",
  },
  sunset: {
    key: "sunset",
    gradient: "linear-gradient(135deg, #831843 0%, #db2777 40%, #f97316 100%)",
    button: "#f97316",
    badge: "light",
  },
};

export const DEFAULT_PRESET: GradientPreset = {
  key: "default",
  gradient:
    "linear-gradient(135deg, color-mix(in oklab, var(--brand-magenta) 45%, transparent) 0%, color-mix(in oklab, var(--brand-orange) 45%, transparent) 100%)",
  button: "var(--primary)",
  badge: "light",
};

export function getPreset(key: string | null | undefined): GradientPreset {
  if (!key) return DEFAULT_PRESET;
  return GRADIENT_PRESETS[key] ?? DEFAULT_PRESET;
}
