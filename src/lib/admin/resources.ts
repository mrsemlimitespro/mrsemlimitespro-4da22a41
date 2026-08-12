import type { ComponentType, SVGProps } from "react";
import {
  KeyRound,
  Users,
  Package,
  Coins,
  Percent,
  Image as ImageIcon,
  Video,
  GraduationCap,
  Megaphone,
  LayoutGrid,
  Store,
  Boxes,
  UserCog,
  Bell,
  Sparkles,
  Blocks,
  Download,
} from "lucide-react";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "datetime"
  | "select"
  | "select_from_table"
  | "image"
  | "media"
  | "file"
  | "array";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  fromTable?: { table: string; labelKey: string; valueKey?: string };
  placeholder?: string;
  step?: number;
  helperText?: string;
  tab?: string;
  accept?: string;
};

export type Resource = {
  key: string;
  label: string;
  singular: string;
  table: string;
  icon: IconType;
  fields: Field[];
  listColumns: {
    key: string;
    label: string;
    format?: "text" | "boolean" | "date" | "currency" | "number";
  }[];
  orderBy?: { column: string; ascending: boolean };
  searchColumns?: string[];
  group?: string;
  hiddenFromSidebar?: boolean;
};

const statusOptions = [
  { value: "ativa", label: "Ativa" },
  { value: "suspensa", label: "Suspensa" },
  { value: "expirada", label: "Expirada" },
  { value: "cancelada", label: "Cancelada" },
];

const tipoLicencaOptions = [
  { value: "teste", label: "Teste (com tempo)" },
  { value: "premium", label: "Premium (sem limite)" },
];

const trialDuracaoOptions = [
  { value: "15", label: "15 minutos" },
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "120", label: "2 horas" },
  { value: "1440", label: "24 horas" },
  { value: "10080", label: "7 dias" },
  { value: "43200", label: "30 dias" },
];

const maxDispositivosOptions = [
  { value: "1", label: "1 dispositivo" },
  { value: "2", label: "2 dispositivos" },
  { value: "5", label: "5 dispositivos" },
  { value: "0", label: "Ilimitado" },
];

const fornecedorSlugOptions = [
  { value: "", label: "— nenhum —" },
  { value: "omega", label: "Omega" },
  { value: "alpha", label: "Alpha" },
  { value: "custom_http", label: "HTTP customizado (config JSON)" },
  { value: "outro", label: "Outro (sem validação upstream)" },
];

export const resources: Resource[] = [
  {
    key: "licencas",
    label: "Licenças (editor detalhado)",
    singular: "Licença",
    table: "licencas",
    icon: KeyRound,
    group: "Usuários",
    hiddenFromSidebar: true,
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["chave", "plano", "email"],
    fields: [
      {
        key: "chave",
        label: "Chave MR (visível ao cliente)",
        type: "text",
        required: true,
        tab: "Identificação",
        helperText: "Ex.: MR-2026-ABCD-EFGH — é a chave que o cliente cola na extensão.",
      },
      {
        key: "produto_id",
        label: "Produto",
        type: "select_from_table",
        fromTable: { table: "licenca_produtos", labelKey: "nome" },
        tab: "Identificação",
      },
      {
        key: "plano",
        label: "Plano (rótulo)",
        type: "text",
        placeholder: "Ex.: Premium anual",
        tab: "Identificação",
      },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        options: tipoLicencaOptions,
        required: true,
        tab: "Identificação",
        helperText:
          "Ao mudar de Teste → Premium, o tempo e a expiração são limpos automaticamente (mesma chave).",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: statusOptions,
        required: true,
        tab: "Identificação",
      },
      {
        key: "expira_em",
        label: "Expira em (Premium com validade)",
        type: "datetime",
        tab: "Identificação",
      },
      {
        key: "fornecedor_slug",
        label: "Fornecedor",
        type: "select",
        options: fornecedorSlugOptions,
        tab: "Fornecedor",
      },
      {
        key: "chave_fornecedor",
        label: "Chave do fornecedor (privada)",
        type: "textarea",
        tab: "Fornecedor",
        helperText:
          "NUNCA aparece para o cliente. O servidor a usa por trás para autorizar a extensão. Deixe vazio se não usa fornecedor.",
      },
      {
        key: "trial_duracao_minutos",
        label: "Duração do teste",
        type: "select",
        options: trialDuracaoOptions,
        tab: "Teste",
        helperText:
          "Só se aplica quando Tipo = Teste. Contagem começa na primeira validação da extensão.",
      },
      {
        key: "trial_iniciado_em",
        label: "Teste iniciado em (readonly)",
        type: "datetime",
        tab: "Teste",
      },
      {
        key: "max_dispositivos",
        label: "Máx. de dispositivos",
        type: "select",
        options: maxDispositivosOptions,
        tab: "Dispositivos",
        helperText: "0 = ilimitado. A extensão fica travada aos dispositivos registrados.",
      },
      {
        key: "versao_min",
        label: "Versão mínima da extensão",
        type: "text",
        placeholder: "Ex.: 1.2.0",
        tab: "Dispositivos",
      },
      {
        key: "cliente_id",
        label: "Cliente",
        type: "select_from_table",
        fromTable: { table: "clientes", labelKey: "nome" },
        tab: "Cliente",
      },
      { key: "email", label: "E-mail (para validação)", type: "text", tab: "Cliente" },
      {
        key: "duracao_dias",
        label: "Duração padrão (dias) — legado",
        type: "number",
        tab: "Cliente",
      },
      { key: "observacoes_admin", label: "Observações internas", type: "textarea", tab: "Cliente" },
    ],
    listColumns: [
      { key: "chave", label: "Chave MR" },
      { key: "tipo", label: "Tipo" },
      { key: "status", label: "Status" },
      { key: "email", label: "E-mail" },
      { key: "expira_em", label: "Expira", format: "date" },
      { key: "created_at", label: "Criada", format: "date" },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    singular: "Cliente",
    table: "clientes",
    icon: Users,
    group: "Usuários",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["nome", "email", "telefone", "whatsapp", "cpf", "empresa"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "email", label: "E-mail", type: "text" },
      { key: "telefone", label: "Telefone", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text" },
      { key: "cpf", label: "CPF/CNPJ", type: "text" },
      { key: "empresa", label: "Empresa", type: "text" },
      {
        key: "revendedor_id",
        label: "Revendedor responsável",
        type: "select_from_table",
        fromTable: { table: "revendedores", labelKey: "nome" },
        helperText: "Vincula este cliente a um revendedor (deixe vazio para cliente direto do master).",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ativo", label: "Ativo" },
          { value: "inativo", label: "Inativo" },
          { value: "bloqueado", label: "Bloqueado" },
        ],
      },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "email", label: "E-mail" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Criado", format: "date" },
    ],
  },
  {
    key: "revendedores",
    label: "Revendedores",
    singular: "Revendedor",
    table: "revendedores",
    icon: UserCog,
    group: "Usuários",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["nome", "email", "telefone"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "email", label: "E-mail", type: "text" },
      { key: "telefone", label: "Telefone", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ativo", label: "Ativo" },
          { value: "inativo", label: "Inativo" },
          { value: "pendente", label: "Pendente" },
        ],
      },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "email", label: "E-mail" },
      { key: "status", label: "Status" },
    ],
  },
  {
    key: "produtos",
    label: "Produtos",
    singular: "Produto",
    table: "produtos",
    icon: Package,
    group: "Comercial",
    orderBy: { column: "ordem", ascending: true },
    searchColumns: ["nome", "titulo", "categoria"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "titulo", label: "Título de exibição", type: "text" },
      { key: "categoria", label: "Categoria", type: "text" },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "preco", label: "Preço (R$)", type: "number", step: 0.01, required: true },
      { key: "imagem_url", label: "Imagem", type: "image" },
      { key: "estoque", label: "Estoque", type: "number" },
      { key: "botao_texto", label: "Texto do botão", type: "text" },
      { key: "link", label: "Link", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "disponivel", label: "Disponível" },
          { value: "esgotado", label: "Esgotado" },
          { value: "em_breve", label: "Em breve" },
          { value: "arquivado", label: "Arquivado" },
        ],
      },
      { key: "ordem", label: "Ordem", type: "number" },
      { key: "ativo", label: "Ativo", type: "boolean" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "categoria", label: "Categoria" },
      { key: "preco", label: "Preço", format: "currency" },
      { key: "estoque", label: "Estoque", format: "number" },
      { key: "status", label: "Status" },
      { key: "ativo", label: "Ativo", format: "boolean" },
    ],
  },
  {
    key: "extensoes",
    label: "Extensões",
    singular: "Extensão",
    table: "extensoes",
    icon: Blocks,
    group: "MR CENTRAL",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["nome", "slug", "sigla"],
    fields: [
      { key: "produto_id", label: "Produto Vinculado", type: "select_from_table", fromTable: { table: "produtos", labelKey: "nome" }, required: true },
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "slug", label: "Slug (URL)", type: "text", required: true, placeholder: "ex: mr-central-lovable" },
      { key: "sigla", label: "Sigla (Licença)", type: "text", required: true, placeholder: "ex: LOV" },
      { key: "icone_url", label: "Ícone (URL)", type: "image" },
      { key: "capa_url", label: "Capa (URL)", type: "image" },
      { key: "descricao", label: "Descrição Curta", type: "textarea" },
      { key: "descricao_completa", label: "Descrição Completa", type: "textarea" },
      {
        key: "categoria",
        label: "Categoria",
        type: "select",
        options: [
          { value: "utilitario", label: "Utilitário" },
          { value: "automacao", label: "Automação" },
          { value: "ia", label: "Inteligência Artificial" },
          { value: "marketing", label: "Marketing" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ativo", label: "Ativo" },
          { value: "manutencao", label: "Em Manutenção" },
          { value: "descontinuado", label: "Descontinuado" },
        ],
      },
      { key: "versao_atual", label: "Versão Atual", type: "text", placeholder: "ex: 1.0.0" },
      { key: "metadata", label: "Metadados (JSON)", type: "textarea" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "sigla", label: "Sigla" },
      { key: "versao_atual", label: "Versão" },
      { key: "status", label: "Status" },
    ],
  },
  {
    key: "product_versions",
    label: "Versões & Releases",
    singular: "Versão",
    table: "product_versions",
    icon: Download,
    group: "MR CENTRAL",
    orderBy: { column: "created_at", ascending: false },
    fields: [
      { key: "extensao_id", label: "Extensão", type: "select_from_table", fromTable: { table: "extensoes", labelKey: "nome" }, required: true },
      { key: "versao", label: "Versão", type: "text", required: true, placeholder: "ex: 1.0.1" },
      { key: "changelog", label: "Notas da Versão", type: "textarea" },
      { key: "download_url", label: "URL de Download", type: "text" },
      { key: "checksum", label: "Checksum (SHA-256)", type: "text" },
      { key: "obrigatoria", label: "Atualização Obrigatória", type: "boolean" },
      { key: "versao_minima", label: "Versão Mínima Compatível", type: "text" },
    ],
    listColumns: [
      { key: "versao", label: "Versão" },
      { key: "obrigatoria", label: "Obrigatória", format: "boolean" },
      { key: "created_at", label: "Lançada em", format: "date" },
    ],
  },
];

export { Store };
export const resourceByKey = new Map(resources.map((r) => [r.key, r]));
