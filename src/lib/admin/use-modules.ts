import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SystemModule = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  categoria: string;
  rota: string | null;
  ordem: number;
  cor: string | null;
  ativo: boolean;
  favorito: boolean;
  mostrar_dashboard: boolean;
  mostrar_sidebar: boolean;
  mostrar_home: boolean;
  mostrar_busca: boolean;
  titulo_home: string | null;
  subtitulo_home: string | null;
  roles: string[];
  created_at: string;
  updated_at: string;
};

export type ModuleSurface = "sidebar" | "home" | "dashboard" | "busca";

export function useModules() {
  const query = useQuery({
    queryKey: ["system_modules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_modules")
        .select("*")
        .order("favorito", { ascending: false })
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SystemModule[];
    },
    staleTime: 60_000,
  });

  const modules = query.data ?? [];
  const loaded = query.isSuccess;
  const bySlug = new Map(modules.map((m) => [m.slug, m]));

  function isActive(slug: string): boolean {
    // Fallback: se ainda não carregou, tudo é visível (não quebra UI).
    if (!loaded) return true;
    const m = bySlug.get(slug);
    if (!m) return true;
    return m.ativo;
  }

  function visibleIn(surface: ModuleSurface, slug: string): boolean {
    if (!loaded) return true;
    const m = bySlug.get(slug);
    if (!m) return true;
    if (!m.ativo) return false;
    switch (surface) {
      case "sidebar":
        return m.mostrar_sidebar;
      case "home":
        return m.mostrar_home;
      case "dashboard":
        return m.mostrar_dashboard;
      case "busca":
        return m.mostrar_busca;
    }
  }

  return {
    modules,
    loaded,
    bySlug,
    isActive,
    visibleIn,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
