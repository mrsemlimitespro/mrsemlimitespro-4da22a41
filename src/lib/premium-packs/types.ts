export type PremiumPackStatus = "ativo" | "rascunho" | "em_breve";

export type PremiumPackSourceType =
  | "none"
  | "google_drive"
  | "dropbox"
  | "onedrive"
  | "cloudflare_r2"
  | "supabase_storage"
  | "local"
  | "outro";

export const PREMIUM_PACK_SOURCE_TYPES: { value: PremiumPackSourceType; label: string }[] = [
  { value: "none", label: "Sem origem definida" },
  { value: "google_drive", label: "Google Drive" },
  { value: "dropbox", label: "Dropbox" },
  { value: "onedrive", label: "OneDrive" },
  { value: "cloudflare_r2", label: "Cloudflare R2" },
  { value: "supabase_storage", label: "Supabase Storage" },
  { value: "local", label: "Local" },
  { value: "outro", label: "Outro" },
];

export type PremiumPackSort = "recentes" | "atualizados" | "baixados" | "populares" | "nome";

export type PremiumPackVisibility = "publico" | "privado" | "expirado" | "desativado";

export type PremiumPackSalesPlatform =
  | "kiwify"
  | "hotmart"
  | "perfectpay"
  | "cakto"
  | "monetizze"
  | "eduzz"
  | "outro";

export const PREMIUM_PACK_SALES_PLATFORMS: { value: PremiumPackSalesPlatform; label: string }[] = [
  { value: "kiwify", label: "Kiwify" },
  { value: "hotmart", label: "Hotmart" },
  { value: "perfectpay", label: "PerfectPay" },
  { value: "cakto", label: "Cakto" },
  { value: "monetizze", label: "Monetizze" },
  { value: "eduzz", label: "Eduzz" },
  { value: "outro", label: "Outro" },
];

export const PREMIUM_PACK_VISIBILITY: { value: PremiumPackVisibility; label: string }[] = [
  { value: "publico", label: "Público" },
  { value: "privado", label: "Privado" },
  { value: "expirado", label: "Expirado" },
  { value: "desativado", label: "Desativado" },
];

export type PremiumPack = {
  id: string;
  slug: string;
  public_token: string;
  visibility_status: PremiumPackVisibility;
  nome: string;
  categoria: string;
  descricao_curta: string | null;
  descricao_completa: string | null;
  banner_url: string | null;
  capa_url: string | null;
  icone_url: string | null;
  video_url: string | null;
  galeria: string[];
  tags: string[];
  status: PremiumPackStatus;
  destaque: boolean;
  is_shareable: boolean;
  allow_download: boolean;
  allow_view: boolean;
  qtd_arquivos: number;
  espaco_bytes: number;
  ordem: number;
  downloads: number;
  views: number;
  popularidade: number;
  autor: string | null;
  versao: string | null;
  compatibilidade: string[];
  observacoes: string | null;
  qr_code_url: string | null;
  public_link: string | null;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  og_image_url: string | null;
  twitter_image_url: string | null;
  source_type: PremiumPackSourceType;
  drive_url: string | null;
  archive_url: string | null;
  ultima_atualizacao: string;
  created_at: string;
  updated_at: string;
};

/**
 * Admin-only view. Inclui o blob de origem criptografado e o link de venda
 * externo (armazenado em `sales_product_id` — o schema do MR Sem Limites usa
 * essa coluna como URL/ID do produto no gateway).
 */
export type AdminPremiumPack = PremiumPack & {
  source_url_encrypted: { v: 1; iv: string; tag: string; ct: string } | null;
  source_metadata: Record<string, unknown>;
  sales_platform: PremiumPackSalesPlatform | null;
  sales_product_id: string | null;
};

export type ListPremiumPacksResult = {
  rows: PremiumPack[];
  total: number;
  nextOffset: number | null;
};
