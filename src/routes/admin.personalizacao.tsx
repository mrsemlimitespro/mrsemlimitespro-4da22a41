import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Palette } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/personalizacao")({
  component: PersonalizacaoPage,
});

const swatches = [
  { name: "Violeta (padrão)", primary: "oklch(0.65 0.24 295)", accent: "oklch(0.68 0.28 340)" },
  { name: "Cyber Azul", primary: "oklch(0.68 0.2 250)", accent: "oklch(0.72 0.2 200)" },
  { name: "Sunset", primary: "oklch(0.7 0.22 30)", accent: "oklch(0.75 0.19 55)" },
  { name: "Neon Verde", primary: "oklch(0.72 0.2 155)", accent: "oklch(0.75 0.19 90)" },
  { name: "Rosa Neon", primary: "oklch(0.68 0.28 340)", accent: "oklch(0.7 0.22 30)" },
];

function PersonalizacaoPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [primary, setPrimary] = useState("");
  const [accent, setAccent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setPrimary(data.primary_color);
      setAccent(data.accent_color);
    }
  }, [data]);

  async function save() {
    if (!data?.id) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("admin_settings")
        .update({ primary_color: primary, accent_color: accent })
        .eq("id", data.id);
      if (error) throw error;
      toast.success("Cores atualizadas");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Aparência
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Personalização</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste as cores do sistema. Escolha um preset ou informe suas próprias cores em{" "}
          <code className="text-xs">oklch()</code>.
        </p>
      </header>

      <section className="glass space-y-5 rounded-2xl p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Cor primária</Label>
            <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
            <div
              className="mt-2 h-10 rounded-lg border border-white/10"
              style={{ background: primary }}
            />
          </div>
          <div>
            <Label>Cor de destaque</Label>
            <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
            <div
              className="mt-2 h-10 rounded-lg border border-white/10"
              style={{ background: accent }}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Presets</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {swatches.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setPrimary(s.primary);
                  setAccent(s.accent);
                }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:bg-white/[0.05]"
              >
                <div className="flex gap-1">
                  <span className="size-6 rounded-full" style={{ background: s.primary }} />
                  <span className="size-6 rounded-full" style={{ background: s.accent }} />
                </div>
                <span className="text-sm">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl border border-white/10 p-6"
          style={{
            background: `linear-gradient(135deg, ${primary}, ${accent})`,
          }}
        >
          <div className="flex items-center gap-3">
            <Palette className="size-6 text-white" />
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/80">Preview</div>
              <div className="text-xl font-semibold text-white">Como ficará o gradiente</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button className="gradient-primary" onClick={save} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Save className="size-4" /> Salvar cores
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
