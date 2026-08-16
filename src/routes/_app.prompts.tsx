import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptsLibraryShell } from "@/components/prompts-library/PromptsLibraryShell";
import { AINovaDashboard } from "@/components/ai-modules/AINovaDashboard";
import { getAINovaStats } from "@/lib/ai-modules/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/prompts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AI Prompts — MR Sem Limites" },
      { name: "description", content: "Catálogo Premium de Prompts Profissionais." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromptsPage,
});

function useDisplayName() {
  const [name, setName] = useState<string>("você");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const md = (u.user_metadata ?? {}) as Record<string, unknown>;
      const candidate =
        (md.full_name as string) ||
        (md.name as string) ||
        (md.display_name as string) ||
        (u.email ? u.email.split("@")[0] : "");
      if (candidate) setName(candidate.split(" ")[0]);
    });
  }, []);
  return name;
}

function PromptsPage() {
  const [view, setView] = useState<"dashboard" | "library">("dashboard");
  const userName = useDisplayName();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["ai-nova-stats", "prompts"],
    queryFn: () => getAINovaStats({ data: { kind: "prompts" } }),
    staleTime: 60_000,
  });

  return (
    <div className="w-full px-3 sm:px-6 py-5">
      {view === "dashboard" ? (
        <AINovaDashboard
          theme="prompts"
          brand="AI Prompts"
          userName={userName}
          userOrg="MR SEM LIMITES"
          stats={stats}
          loading={isLoading}
          onOpenLibrary={() => setView("library")}
          onCreate={() => setView("library")}
        />
      ) : (
        <div data-ai-theme="prompts" className="ai-module">
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => setView("dashboard")}
              className="gap-2 border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <span className="ml-3 inline-flex items-center gap-2 text-white/60 text-sm">
              <Wand2 className="h-4 w-4" /> Biblioteca de Prompts
            </span>
          </div>
          <PromptsLibraryShell />
        </div>
      )}
    </div>
  );
}
