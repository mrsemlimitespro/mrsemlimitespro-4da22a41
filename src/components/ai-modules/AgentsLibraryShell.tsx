/**
 * AgentsLibraryShell — biblioteca pública de Agentes IA.
 * Copiado do projeto Link MR Store Pro com adaptações mínimas:
 *   - `usePremiumFavorites` → `useLocalFavorites` (destino não tem tabela de
 *     favoritos de agentes; usamos localStorage).
 *   - Sem dependência de `AppAuthorizationProvider`.
 * Layout, componentes, ações e comportamento idênticos à origem.
 */
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Heart, Share2, Files, Download } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Search, Sparkles, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAgents, type AiAgent } from "@/lib/ai-agents.functions";
import { AICard, AIEmptyState, AIPill } from "@/components/ai-modules/AIModuleShell";
import { useLocalFavorites } from "@/hooks/useLocalFavorites";
import { copyText } from "@/lib/clipboard";
import { downloadItemAsHtml } from "@/lib/download-item";

export function AgentsLibraryShell() {
  const fetchAgents = useServerFn(getAgents);
  const { data, isLoading } = useQuery({
    queryKey: ["ai-agents", "public"],
    queryFn: () => fetchAgents(),
    staleTime: 60_000,
  });

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<AiAgent | null>(null);

  const agents = data ?? [];

  const categories = useMemo(() => {
    const set = new Map<string, number>();
    for (const a of agents) {
      const c = a.categoria || "Outros";
      set.set(c, (set.get(c) ?? 0) + 1);
    }
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
  }, [agents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (cat && a.categoria !== cat) return false;
      if (!q) return true;
      const hay = [a.titulo, a.descricao, a.categoria, a.subcategoria, (a.tags || []).join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [agents, search, cat]);

  return (
    <div data-ai-theme="agents" className="ai-module relative w-full">
      {/* Hero */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">AGENTES IA</h1>
          <p className="text-white/55 text-sm mt-1">
            Catálogo Premium de Agentes Inteligentes.
            {agents.length > 0 && (
              <span className="ml-1 text-white/40">
                · {agents.length.toLocaleString("pt-BR")} cadastrados
              </span>
            )}
          </p>
        </div>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por nome, categoria, tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/10 focus-visible:border-white/30 focus-visible:ring-white/10"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <AIPill active={!cat} onClick={() => setCat(null)}>
            <Sparkles className="w-3 h-3" /> Tudo ({agents.length})
          </AIPill>
          {categories.map(([c, n]) => (
            <AIPill key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
              {c} ({n})
            </AIPill>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <AIEmptyState
          icon={Bot}
          title={agents.length === 0 ? "Nenhum agente cadastrado" : "Nenhum agente encontrado"}
          description={
            agents.length === 0
              ? "Os agentes cadastrados no Admin aparecerão aqui automaticamente."
              : "Tente outra busca ou remova os filtros."
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
          {filtered.map((a) => (
            <AgentCard key={a.id} agent={a} onOpen={() => setOpen(a)} />
          ))}
        </div>
      )}

      {open && (
        <AgentModal
          agent={open}
          onClose={() => setOpen(null)}
          related={agents
            .filter(
              (a) => a.id !== open.id && (open.categoria ? a.categoria === open.categoria : true),
            )
            .slice(0, 3)}
          onOpenOther={(a) => setOpen(a)}
        />
      )}
    </div>
  );
}

function AgentCard({ agent, onOpen }: { agent: AiAgent; onOpen: () => void }) {
  return (
    <AICard onClick={onOpen} className="cursor-pointer overflow-hidden p-0">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-ai-500/20 via-black to-ai-400/10">
        {agent.cover_url ? (
          <img
            src={agent.cover_url}
            alt={agent.titulo}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <Bot className="w-12 h-12 text-ai-200/40" />
          </div>
        )}
        {agent.destaque && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-ai-500/30 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-ai-50 border border-ai-300/40">
            <Star className="w-3 h-3" /> Destaque
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ai-200/70 font-bold">
            {agent.categoria || "Agente"}
          </div>
          <h3 className="text-sm font-bold text-white line-clamp-2">{agent.titulo}</h3>
        </div>
      </div>
    </AICard>
  );
}

function AgentModal({
  agent,
  onClose,
  related = [],
  onOpenOther,
}: {
  agent: AiAgent;
  onClose: () => void;
  related?: AiAgent[];
  onOpenOther?: (a: AiAgent) => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { isFav, toggle } = useLocalFavorites("ai-agent");
  const fav = isFav(agent.id);

  const onFavorite = () => {
    toggle(agent.id);
    toast.success(fav ? "Removido dos favoritos" : "Adicionado aos favoritos");
  };

  const buildMarkdown = () => {
    const parts = [
      `# ${agent.titulo}`,
      agent.descricao ? `\n${agent.descricao}` : "",
      agent.descricao_completa ? `\n## Descrição completa\n${agent.descricao_completa}` : "",
      agent.system_prompt ? `\n## System Prompt\n\n\`\`\`\n${agent.system_prompt}\n\`\`\`` : "",
      agent.instrucoes ? `\n## Instruções\n\n${agent.instrucoes}` : "",
      agent.tags?.length ? `\n**Tags:** ${agent.tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return parts;
  };

  const buildShareText = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const divider = "────────────────";
    const lines: string[] = [];
    if (agent.cover_url) lines.push(agent.cover_url, "");
    lines.push(`*${agent.titulo.toUpperCase()}*`);
    if (agent.categoria) {
      lines.push(`_${agent.categoria}${agent.subcategoria ? ` · ${agent.subcategoria}` : ""}_`);
    }
    if (agent.descricao) lines.push("", agent.descricao);
    if (agent.system_prompt) {
      lines.push("", divider, "SYSTEM PROMPT", divider, agent.system_prompt);
    }
    const promptBody = agent.instrucoes || agent.descricao_completa;
    if (promptBody) {
      lines.push("", divider, "PROMPT", divider, promptBody);
    }
    const meta: string[] = [];
    if (agent.modelo) meta.push(`Modelo: ${agent.modelo}`);
    if (agent.autor) meta.push(`Autor: ${agent.autor}`);
    if (agent.versao) meta.push(`Versão: ${agent.versao}`);
    if (meta.length) lines.push("", meta.join(" · "));
    if (agent.tags?.length) {
      lines.push("", agent.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" "));
    }
    if (url) lines.push("", divider, "Abrir agente", url);
    return lines.join("\n");
  };

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = buildShareText();
    const nav = typeof navigator !== "undefined" ? navigator : null;
    try {
      if (nav?.share) {
        await nav.share({ title: agent.titulo, text, url });
        return;
      }
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Conteúdo do agente copiado");
    } catch {
      toast.error("Falha ao compartilhar");
    }
  };

  const onDuplicate = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      toast.success("Agente duplicado para a área de transferência");
    } catch {
      toast.error("Falha ao duplicar");
    }
  };

  const dateStr = (() => {
    try {
      return new Date(agent.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  })();

  const Divider = () => (
    <div className="my-6 flex items-center gap-3 text-ai-300/30">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-ai-300/30 to-transparent" />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start sm:place-items-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        data-ai-theme="agents"
        className="ai-module relative w-full max-w-4xl my-4 rounded-2xl border border-ai-300/30 bg-[#06060a]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white/80 z-20 border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative px-4 sm:px-6 pt-6">
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-ai-300/20 bg-gradient-to-b from-black via-[#0a0a12] to-black shadow-[0_30px_80px_-20px_rgba(0,180,255,0.25)]"
            style={{ height: "clamp(280px, 52vw, 560px)" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,200,255,0.10),transparent_60%)]" />
            {agent.cover_url ? (
              <img
                src={agent.cover_url}
                alt={agent.titulo}
                className="relative z-10 w-full h-full object-contain"
              />
            ) : (
              <div className="relative z-10 w-full h-full grid place-items-center">
                <Bot className="w-20 h-20 text-ai-200/40" />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-ai-50 via-ai-200 to-ai-300 bg-clip-text text-transparent">
              {agent.titulo}
            </h2>
            {agent.descricao && (
              <p className="mt-2 text-sm sm:text-base text-white/70 italic">
                Especialista em {agent.descricao}
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-0.5 text-ai-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {agent.modelo && <Info label="Modelo" value={agent.modelo} />}
            {agent.versao && <Info label="Versão" value={agent.versao} />}
            {agent.autor && <Info label="Autor" value={agent.autor} />}
            {agent.categoria && <Info label="Categoria" value={agent.categoria} />}
            {dateStr && <Info label="Data" value={dateStr} />}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={async () => {
                const ok = await copyText(
                  agent.system_prompt || agent.descricao_completa || agent.descricao || "",
                );
                if (ok) toast.success("Prompt copiado");
                else toast.error("Falha ao copiar");
              }}
              className="h-8 gap-1.5 bg-gradient-to-r from-ai-500 to-ai-400 text-black font-bold"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar Prompt
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                downloadItemAsHtml({
                  titulo: agent.titulo,
                  categoria: agent.categoria,
                  subcategoria: agent.subcategoria,
                  descricao: agent.descricao,
                  descricao_completa: agent.descricao_completa,
                  prompt: agent.system_prompt || agent.descricao_completa || agent.descricao,
                  cover_url: agent.cover_url,
                  autor: agent.autor,
                  versao: agent.versao,
                });
                toast.success("Download iniciado");
              }}
              className="h-8 gap-1.5 border-ai-300/30 text-ai-100 hover:bg-ai-500/10"
            >
              <Download className="w-3.5 h-3.5" /> Baixar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onFavorite}
              className={cn(
                "h-8 gap-1.5 border-ai-300/30",
                fav
                  ? "bg-rose-500/15 text-rose-200 border-rose-300/40"
                  : "text-ai-100 hover:bg-ai-500/10",
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", fav && "fill-current")} />{" "}
              {fav ? "Favoritado" : "Favoritar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onShare}
              className="h-8 gap-1.5 border-ai-300/30 text-ai-100 hover:bg-ai-500/10"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDuplicate}
              className="h-8 gap-1.5 border-ai-300/30 text-ai-100 hover:bg-ai-500/10"
            >
              <Files className="w-3.5 h-3.5" /> Duplicar
            </Button>
          </div>

          {(agent.descricao_completa || agent.descricao) && (
            <>
              <Divider />
              <SectionBlock
                title="Descrição"
                content={agent.descricao_completa || agent.descricao}
              />
            </>
          )}

          {agent.system_prompt && (
            <>
              <Divider />
              <SectionBlock title="System Prompt" content={agent.system_prompt} mono copyable />
            </>
          )}

          {agent.instrucoes && (
            <>
              <Divider />
              <SectionBlock title="Prompt" content={agent.instrucoes} mono copyable />
            </>
          )}

          {(agent.compatibilidade?.length ?? 0) > 0 && (
            <>
              <Divider />
              <div>
                <h3 className="text-center text-[11px] uppercase tracking-[0.32em] text-ai-200 font-bold mb-4">
                  Compatibilidade
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {agent.compatibilidade.map((c) => (
                    <span
                      key={c}
                      className="text-[12px] px-3 py-1 rounded-full bg-ai-500/10 border border-ai-300/30 text-ai-100"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {(agent.tags?.length ?? 0) > 0 && (
            <>
              <Divider />
              <div className="flex flex-wrap justify-center gap-1.5">
                {agent.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </>
          )}

          {related.length > 0 && onOpenOther && (
            <>
              <Divider />
              <div>
                <h3 className="text-center text-[11px] uppercase tracking-[0.32em] text-ai-200 font-bold mb-4">
                  Você também pode gostar
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onOpenOther(r)}
                      className="group text-left rounded-xl overflow-hidden border border-ai-300/15 bg-black/40 hover:border-ai-300/40 transition"
                    >
                      <div className="aspect-[3/4] relative bg-gradient-to-br from-ai-500/20 via-black to-ai-400/10">
                        {r.cover_url ? (
                          <img
                            src={r.cover_url}
                            alt={r.titulo}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center">
                            <Bot className="w-8 h-8 text-ai-200/40" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-[11px] font-semibold text-white line-clamp-2 uppercase tracking-wide">
                        {r.titulo}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  content,
  mono = false,
  copyable = false,
}: {
  title: string;
  content: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const ok = await copyText(content);
    if (ok) {
      setCopied(true);
      toast.success(`${title} copiado`);
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Falha ao copiar");
    }
  };
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-[0.32em] text-ai-200 font-bold">{title}</h3>
        {copyable && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            className="h-7 gap-1.5 border-ai-300/30 bg-ai-500/10 text-ai-100 hover:bg-ai-500/20 text-[11px]"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        )}
      </div>
      <div
        className={cn(
          "text-[13px] leading-relaxed text-white/85 whitespace-pre-wrap break-words",
          mono && "font-mono text-[12.5px]",
        )}
      >
        {content}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2")}>
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="text-xs text-white mt-0.5 truncate">{value}</div>
    </div>
  );
}
