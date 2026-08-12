import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AINovaDashboard } from "@/components/ai-modules/AINovaDashboard";
import { getAINovaStats } from "@/lib/ai-modules/dashboard.functions";
import { PremiumPacksHub } from "@/components/premium-packs/PremiumPacksHub";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/_app/packs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Packs Premium — MR Sem Limites" },
      { name: "description", content: "Coleções premium com acesso vitalício." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PacksPage />
    </RequireAuth>
  ),
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

function PacksPage() {
  const [view, setView] = useState<"dashboard" | "library">("dashboard");
  const userName = useDisplayName();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["ai-nova-stats", "packs"],
    queryFn: () => getAINovaStats({ data: { kind: "packs" } }),
    staleTime: 60_000,
  });

  return (
    <div className="w-full px-3 sm:px-6 py-5">
      {view === "dashboard" ? (
        <AINovaDashboard
          theme="packs"
          brand="Packs Premium"
          userName={userName}
          userOrg="MR SEM LIMITES"
          stats={stats}
          loading={isLoading}
          onOpenLibrary={() => setView("library")}
          onCreate={() => setView("library")}
        />
      ) : (
        <PremiumPacksHub onBack={() => setView("dashboard")} />
      )}
    </div>
  );
}
