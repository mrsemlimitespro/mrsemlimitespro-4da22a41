/**
 * Catálogo oficial da Biblioteca de Prompts.
 * Categorias e subcategorias usadas no sidebar / filtros.
 */

export const PROMPT_LIBRARY_CATEGORIES = [
  "Imagem",
  "Vídeo",
  "Copywriting",
  "Marketing",
  "SEO",
  "Redes Sociais",
  "IA",
  "Automação",
  "Lovable",
  "Sites",
  "Landing Pages",
  "Aplicativos",
  "SaaS",
  "E-commerce",
  "Negócios",
  "Produtividade",
  "Empresas",
  "Atendimento",
  "Chatbots",
  "Programação",
  "Design",
  "Branding",
  "Vendas",
  "Afiliados",
  "Anúncios",
  "Omega Elite",
] as const;

export type PromptLibraryCategory = (typeof PROMPT_LIBRARY_CATEGORIES)[number];

export const PROMPT_LIBRARY_SUBCATEGORIES: Record<string, string[]> = {
  Imagem: [
    "Instagram",
    "Facebook",
    "Banner",
    "Logo",
    "Mockup",
    "Produto",
    "Thumbnail",
    "Outdoor",
    "Story",
  ],
  Vídeo: ["Reels", "TikTok", "YouTube", "Shorts", "VSL", "Anúncio"],
  Copywriting: ["Headlines", "E-mail", "Sales Letter", "Bio", "CTA"],
  Marketing: ["Funil", "Lançamento", "Email Marketing", "Branding"],
  SEO: ["On-Page", "Off-Page", "Keywords", "Conteúdo"],
  "Redes Sociais": ["Instagram", "TikTok", "LinkedIn", "Twitter", "Facebook"],
  IA: ["ChatGPT", "Claude", "Gemini", "Midjourney", "Sora"],
  Automação: ["n8n", "Make", "Zapier", "WhatsApp"],
  Lovable: ["UI", "Backend", "Fix", "Refatorar", "Feature"],
  Sites: ["Institucional", "Portfolio", "Blog"],
  "Landing Pages": ["Lançamento", "Captura", "Vendas"],
  Aplicativos: ["Mobile", "Web", "PWA"],
  SaaS: ["Onboarding", "Pricing", "Dashboard"],
  "E-commerce": ["Produto", "Checkout", "Anúncio"],
  Negócios: ["Plano", "Pitch", "Proposta"],
  Produtividade: ["Notion", "Tarefas", "Reuniões"],
  Empresas: ["Cultura", "RH", "Treinamento"],
  Atendimento: ["FAQ", "SAC", "Pós-Venda"],
  Chatbots: ["WhatsApp", "Telegram", "Instagram"],
  Programação: ["TypeScript", "React", "SQL", "Node", "Python"],
  Design: ["UI", "UX", "Identidade Visual"],
  Branding: ["Naming", "Voz", "Manifesto"],
  Vendas: ["Script", "Objeções", "Follow-up"],
  Afiliados: ["Anúncio", "Bio", "Review"],
  Anúncios: ["Meta", "Google", "TikTok"],
  "Omega Elite": ["VIP", "Exclusivo"],
};

export const PROMPT_STATUS_OPTIONS = ["Premium", "Elite", "Novo", "Atualizado", "Popular"] as const;
export type PromptStatus = (typeof PROMPT_STATUS_OPTIONS)[number];

export const PROMPT_LEVELS = ["Iniciante", "Intermediário", "Avançado", "Elite"] as const;
export type PromptLevel = (typeof PROMPT_LEVELS)[number];

export const PROMPT_COMPATIBILITY = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Midjourney",
  "Sora",
  "DALL·E",
  "Lovable",
  "Stable Diffusion",
  "Runway",
] as const;

export function formatPromptNumber(n: number | null | undefined): string {
  const num = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `Prompt ${String(num).padStart(3, "0")}`;
}
