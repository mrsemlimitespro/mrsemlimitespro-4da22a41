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
      // === Identificação ===
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

      // === Fornecedor (oculto do cliente) ===
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
      // fornecedor_config (jsonb) fica gerenciado pelo servidor; se precisar customizar, edite via banco.

      // === Teste ===
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

      // === Dispositivos ===
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

      // === Cliente ===
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
    key: "licenca_produtos",
    label: "Produtos (Licenças)",
    singular: "Produto",
    table: "licenca_produtos",
    icon: Package,
    group: "Usuários",
    hiddenFromSidebar: true,
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["nome", "slug"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      {
        key: "slug",
        label: "Slug",
        type: "text",
        required: true,
        placeholder: "ex.: mr-extension-pro",
      },
      { key: "descricao", label: "Descrição", type: "textarea" },
      {
        key: "fornecedor_padrao",
        label: "Fornecedor padrão",
        type: "select",
        options: fornecedorSlugOptions,
      },
      { key: "versao_atual", label: "Versão atual", type: "text" },
      { key: "ativo", label: "Ativo", type: "boolean" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "slug", label: "Slug" },
      { key: "versao_atual", label: "Versão" },
      { key: "ativo", label: "Ativo", format: "boolean" },
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
    key: "estoque",
    label: "Estoque",
    singular: "Item de estoque",
    table: "estoque",
    icon: Boxes,
    group: "Comercial",
    orderBy: { column: "item", ascending: true },
    searchColumns: ["item"],
    fields: [
      { key: "item", label: "Item", type: "text", required: true },
      {
        key: "produto_id",
        label: "Produto vinculado",
        type: "select_from_table",
        fromTable: { table: "produtos", labelKey: "nome" },
      },
      { key: "quantidade", label: "Quantidade", type: "number", required: true },
      { key: "minimo", label: "Mínimo", type: "number" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "disponivel", label: "Disponível" },
          { value: "baixo", label: "Estoque baixo" },
          { value: "esgotado", label: "Esgotado" },
        ],
      },
      { key: "observacoes", label: "Observações", type: "textarea" },
    ],
    listColumns: [
      { key: "item", label: "Item" },
      { key: "quantidade", label: "Qtd.", format: "number" },
      { key: "minimo", label: "Mínimo", format: "number" },
      { key: "status", label: "Status" },
    ],
  },
  {
    key: "creditos",
    label: "Créditos",
    singular: "Pacote de créditos",
    table: "creditos_packs",
    icon: Coins,
    group: "Comercial",
    orderBy: { column: "quantidade", ascending: true },
    searchColumns: ["nome"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "quantidade", label: "Quantidade de créditos", type: "number", required: true },
      { key: "preco", label: "Preço (R$)", type: "number", step: 0.01, required: true },
      { key: "imagem_url", label: "Imagem do pacote", type: "image" },
      {
        key: "badge",
        label: "Etiqueta (ex: PRO, POWER, ESSE SIM)",
        type: "text",
        placeholder: "PRO",
        helperText: "Etiqueta pequena no topo do card (opcional).",
      },
      {
        key: "cor_gradiente",
        label: "Cor / gradiente do card",
        type: "select",
        options: [
          { value: "", label: "Padrão (violeta → laranja)" },
          { value: "violet", label: "Violeta" },
          { value: "magenta", label: "Magenta" },
          { value: "orange", label: "Laranja" },
          { value: "cyan", label: "Ciano" },
          { value: "emerald", label: "Verde" },
          { value: "pink", label: "Rosa" },
          { value: "gold", label: "Dourado" },
          { value: "sunset", label: "Sunset (magenta→laranja)" },
        ],
        helperText: "Define o gradiente colorido do card na Loja.",
      },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "ativo", label: "Ativo", type: "boolean" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "quantidade", label: "Qtd.", format: "number" },
      { key: "preco", label: "Preço", format: "currency" },
      { key: "ativo", label: "Ativo", format: "boolean" },
    ],
  },
  {
    key: "planos",
    label: "Planos",
    singular: "Plano",
    table: "planos",
    icon: Sparkles,
    group: "Comercial",
    orderBy: { column: "preco", ascending: true },
    searchColumns: ["nome"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "preco", label: "Preço (R$)", type: "number", step: 0.01, required: true },
      { key: "creditos_incluidos", label: "Créditos incluídos", type: "number", required: true },
      {
        key: "duracao_dias",
        label: "Duração (dias)",
        type: "number",
        required: true,
        helperText: "Ex: 30 = mensal, 365 = anual, 3650 = vitalício.",
      },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        options: [
          { value: "mensal", label: "Mensal" },
          { value: "anual", label: "Anual" },
          { value: "vitalicio", label: "Vitalício" },
          { value: "pacote", label: "Pacote" },
        ],
      },
      { key: "imagem_url", label: "Imagem do plano", type: "image" },
      {
        key: "badge",
        label: "Etiqueta (ex: PRO, POWER)",
        type: "text",
        placeholder: "PRO LITE",
        helperText: "Etiqueta pequena no topo do card (opcional).",
      },
      {
        key: "cor_gradiente",
        label: "Cor / gradiente do card",
        type: "select",
        options: [
          { value: "", label: "Padrão (violeta → laranja)" },
          { value: "violet", label: "Violeta" },
          { value: "magenta", label: "Magenta" },
          { value: "orange", label: "Laranja" },
          { value: "cyan", label: "Ciano" },
          { value: "emerald", label: "Verde" },
          { value: "pink", label: "Rosa" },
          { value: "gold", label: "Dourado" },
          { value: "sunset", label: "Sunset (magenta→laranja)" },
        ],
      },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "cor", label: "Cor (ex: violet, magenta)", type: "text" },
      { key: "icone", label: "Ícone (nome lucide)", type: "text", placeholder: "Sparkles" },
      { key: "botao_texto", label: "Texto do botão", type: "text", placeholder: "Assinar" },
      { key: "link", label: "Link do botão", type: "text" },
      { key: "ordem", label: "Ordem", type: "number" },
      { key: "destaque", label: "Destaque", type: "boolean" },
      { key: "ativo", label: "Ativo", type: "boolean" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "preco", label: "Preço", format: "currency" },
      { key: "creditos_incluidos", label: "Créditos", format: "number" },
      { key: "duracao_dias", label: "Dias", format: "number" },
      { key: "ordem", label: "Ordem", format: "number" },
      { key: "ativo", label: "Ativo", format: "boolean" },
    ],
  },
  {
    key: "promocoes",
    label: "Promoções",
    singular: "Promoção",
    table: "promocoes",
    icon: Percent,
    group: "Comercial",
    orderBy: { column: "ordem", ascending: true },
    searchColumns: ["titulo", "codigo_cupom"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "subtitulo", label: "Subtítulo", type: "text" },
      { key: "descricao", label: "Descrição", type: "textarea" },
      {
        key: "revendedor_id",
        label: "Revendedor dono (opcional)",
        type: "select_from_table",
        fromTable: { table: "revendedores", labelKey: "nome" },
        helperText: "Vazio = promoção global do master. Preenchido = promoção do revendedor.",
      },
      { key: "codigo_cupom", label: "Código do cupom", type: "text", placeholder: "PROMO10" },
      { key: "desconto_percent", label: "Desconto (%) do cupom", type: "number", step: 0.5 },
      { key: "desconto_valor", label: "Desconto (R$) do cupom", type: "number", step: 0.01 },
      { key: "uso_maximo", label: "Usos máximos", type: "number", helperText: "0 ou vazio = ilimitado" },
      { key: "usos_atuais", label: "Usos atuais", type: "number" },
      { key: "imagem_url", label: "Imagem principal", type: "image" },
      { key: "banner_desktop_url", label: "Banner desktop", type: "image" },
      { key: "banner_mobile_url", label: "Banner mobile", type: "image" },
      { key: "botao_texto", label: "Texto do botão", type: "text", placeholder: "Aproveitar" },
      { key: "link", label: "Link do botão", type: "text", placeholder: "https://…" },
      { key: "preco_antigo", label: "Preço antigo (R$)", type: "number", step: 0.01 },
      { key: "preco_atual", label: "Preço atual (R$)", type: "number", step: 0.01 },
      { key: "desconto_percentual", label: "Desconto exibido (%)", type: "number", step: 0.5 },
      { key: "cor", label: "Cor (ex: violet, magenta, orange)", type: "text" },
      { key: "icone", label: "Ícone (nome lucide)", type: "text", placeholder: "Percent" },
      { key: "ordem", label: "Ordem", type: "number" },
      { key: "destaque", label: "Destaque", type: "boolean" },
      {
        key: "plano_id",
        label: "Plano vinculado (opcional)",
        type: "select_from_table",
        fromTable: { table: "planos", labelKey: "nome" },
      },
      {
        key: "pack_id",
        label: "Pack de créditos vinculado (opcional)",
        type: "select_from_table",
        fromTable: { table: "creditos_packs", labelKey: "nome" },
      },
      { key: "inicio", label: "Data inicial", type: "datetime" },
      { key: "fim", label: "Data final", type: "datetime" },
      { key: "ativo", label: "Ativa", type: "boolean" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "codigo_cupom", label: "Cupom" },
      { key: "desconto_percent", label: "Desc %", format: "number" },
      { key: "preco_atual", label: "Preço", format: "currency" },
      { key: "ordem", label: "Ordem", format: "number" },
      { key: "ativo", label: "Ativa", format: "boolean" },
      { key: "fim", label: "Fim", format: "date" },
    ],
  },
  {
    key: "carrossel",
    label: "Carrossel",
    singular: "Slide",
    table: "carrossel_slides",
    icon: LayoutGrid,
    group: "Comercial",
    orderBy: { column: "ordem", ascending: true },
    searchColumns: ["titulo"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "subtitulo", label: "Subtítulo", type: "text" },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "imagem_desktop_url", label: "Imagem Desktop", type: "image" },
      { key: "imagem_mobile_url", label: "Imagem Mobile", type: "image" },
      { key: "preco", label: "Preço (R$)", type: "number", step: 0.01 },
      { key: "preco_promocional", label: "Preço promocional (R$)", type: "number", step: 0.01 },
      { key: "botao_texto", label: "Texto do botão", type: "text" },
      { key: "link", label: "Link do botão", type: "text" },
      { key: "cor_botao", label: "Cor do botão", type: "text" },
      { key: "cor_fundo", label: "Cor do fundo", type: "text" },
      { key: "badge", label: "Badge", type: "text" },
      { key: "icone", label: "Ícone (lucide)", type: "text" },
      { key: "ordem", label: "Ordem", type: "number" },
      { key: "inicio", label: "Data início", type: "datetime" },
      { key: "fim", label: "Data fim", type: "datetime" },
      { key: "agendamento", label: "Agendamento", type: "datetime" },
      { key: "ativo", label: "Ativo", type: "boolean" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "preco_promocional", label: "Promo", format: "currency" },
      { key: "ordem", label: "Ordem", format: "number" },
      { key: "ativo", label: "Ativo", format: "boolean" },
      { key: "fim", label: "Fim", format: "date" },
    ],
  },
  {
    key: "banners",
    label: "Banners",
    singular: "Banner",
    table: "banners",
    icon: LayoutGrid,
    group: "Comercial",
    orderBy: { column: "ordem", ascending: true },
    searchColumns: ["titulo"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "subtitulo", label: "Subtítulo", type: "text" },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "imagem_url", label: "Imagem Desktop", type: "image" },
      { key: "imagem_mobile_url", label: "Imagem Mobile", type: "image" },
      { key: "preco", label: "Preço (R$)", type: "number", step: 0.01 },
      { key: "preco_promocional", label: "Preço promocional (R$)", type: "number", step: 0.01 },
      { key: "botao_texto", label: "Texto do botão", type: "text" },
      { key: "cor_botao", label: "Cor do botão", type: "text" },
      { key: "cor_fundo", label: "Cor do fundo", type: "text" },
      { key: "badge", label: "Badge", type: "text" },
      { key: "icone", label: "Ícone (lucide)", type: "text" },
      { key: "link", label: "Link", type: "text" },
      { key: "ordem", label: "Ordem", type: "number" },
      { key: "inicio", label: "Início", type: "datetime" },
      { key: "fim", label: "Fim", type: "datetime" },
      { key: "ativo", label: "Ativo", type: "boolean" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "ordem", label: "Ordem", format: "number" },
      { key: "ativo", label: "Ativo", format: "boolean" },
    ],
  },
  {
    key: "propagandas",
    label: "Propagandas",
    singular: "Propaganda",
    table: "propagandas",
    icon: Megaphone,
    group: "Comercial",
    orderBy: { column: "ordem", ascending: true },
    searchColumns: ["titulo"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "subtitulo", label: "Subtítulo", type: "text" },
      { key: "texto", label: "Descrição", type: "textarea" },
      { key: "imagem_url", label: "Imagem principal", type: "image" },
      { key: "imagem_desktop_url", label: "Imagem Desktop", type: "image" },
      { key: "imagem_mobile_url", label: "Imagem Mobile", type: "image" },
      { key: "botao_texto", label: "Texto do botão", type: "text" },
      { key: "link", label: "Link", type: "text" },
      {
        key: "posicao",
        label: "Posição",
        type: "select",
        options: [
          { value: "home", label: "Home" },
          { value: "topo", label: "Topo" },
          { value: "rodape", label: "Rodapé" },
          { value: "sidebar", label: "Sidebar" },
          { value: "modal", label: "Modal" },
        ],
      },
      { key: "ordem", label: "Ordem", type: "number" },
      {
        key: "tempo_segundos",
        label: "Tempo (segundos)",
        type: "number",
        helperText: "Duração de exibição em segundos",
      },
      { key: "mostrar_premium", label: "Somente Premium", type: "boolean" },
      { key: "inicio", label: "Início", type: "datetime" },
      { key: "fim", label: "Fim", type: "datetime" },
      { key: "ativo", label: "Ativa", type: "boolean" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "posicao", label: "Posição" },
      { key: "ordem", label: "Ordem", format: "number" },
      { key: "ativo", label: "Ativa", format: "boolean" },
    ],
  },
  {
    key: "aulas",
    label: "Biblioteca",
    singular: "Aula",
    table: "aulas",
    icon: GraduationCap,
    group: "Conteúdo",
    orderBy: { column: "ordem", ascending: true },
    searchColumns: ["titulo"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "video_url", label: "URL do vídeo", type: "text" },
      { key: "thumbnail_url", label: "Thumbnail", type: "image" },
      { key: "ordem", label: "Ordem", type: "number" },
      { key: "ativo", label: "Ativa", type: "boolean" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "ordem", label: "Ordem", format: "number" },
      { key: "ativo", label: "Ativa", format: "boolean" },
    ],
  },
  {
    key: "imagens",
    label: "Upload de Imagens",
    singular: "Imagem",
    table: "imagens",
    icon: ImageIcon,
    group: "Conteúdo",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["titulo", "categoria"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "url", label: "Arquivo", type: "image", required: true },
      { key: "categoria", label: "Categoria", type: "text" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "categoria", label: "Categoria" },
      { key: "created_at", label: "Enviada", format: "date" },
    ],
  },
  {
    key: "videos",
    label: "Upload de Vídeos",
    singular: "Vídeo",
    table: "videos",
    icon: Video,
    group: "Conteúdo",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["titulo"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      {
        key: "url",
        label: "URL do vídeo / Upload",
        type: "image",
        required: true,
        placeholder: "https://... ou envie o arquivo",
      },
      { key: "thumbnail_url", label: "Thumbnail", type: "image" },
      { key: "descricao", label: "Descrição", type: "textarea" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "created_at", label: "Criado", format: "date" },
    ],
  },
  {
    key: "logos",
    label: "Upload de Logos",
    singular: "Logo",
    table: "logos",
    icon: Sparkles,
    group: "Conteúdo",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["titulo"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "url", label: "Arquivo", type: "image", required: true },
      {
        key: "escopo",
        label: "Escopo",
        type: "select",
        options: [
          { value: "principal", label: "Principal" },
          { value: "secundaria", label: "Secundária" },
          { value: "favicon", label: "Favicon" },
          { value: "email", label: "E-mail" },
        ],
      },
      { key: "ativo", label: "Ativo", type: "boolean" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "escopo", label: "Escopo" },
      { key: "ativo", label: "Ativo", format: "boolean" },
    ],
  },
  {
    key: "notificacoes",
    label: "Notificações",
    singular: "Notificação",
    table: "notificacoes",
    icon: Bell,
    group: "Sistema",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["titulo"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true },
      { key: "mensagem", label: "Mensagem", type: "textarea", required: true },
      {
        key: "tipo",
        label: "Tipo",
        type: "select",
        options: [
          { value: "info", label: "Info" },
          { value: "sucesso", label: "Sucesso" },
          { value: "aviso", label: "Aviso" },
          { value: "erro", label: "Erro" },
        ],
      },
      {
        key: "destino",
        label: "Destino",
        type: "select",
        options: [
          { value: "todos", label: "Todos" },
          { value: "clientes", label: "Clientes" },
          { value: "revendedores", label: "Revendedores" },
        ],
      },
      { key: "ativo", label: "Ativa", type: "boolean" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "tipo", label: "Tipo" },
      { key: "destino", label: "Destino" },
      { key: "ativo", label: "Ativa", format: "boolean" },
    ],
  },
  // =========================================================================
  // AGENTES DE IA — catálogo do painel de Agents
  // =========================================================================
  {
    key: "ai-agents",
    label: "Agents",
    singular: "Agente",
    table: "ai_agents",
    icon: Sparkles,
    group: "Comercial",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["titulo", "categoria"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true, tab: "Informações" },
      { key: "descricao", label: "Descrição curta", type: "textarea", tab: "Informações" },
      {
        key: "descricao_completa",
        label: "Descrição completa",
        type: "textarea",
        tab: "Informações",
      },
      { key: "categoria", label: "Categoria", type: "text", tab: "Informações" },
      { key: "subcategoria", label: "Subcategoria", type: "text", tab: "Informações" },
      { key: "autor", label: "Autor", type: "text", tab: "Informações" },
      {
        key: "nivel",
        label: "Nível",
        type: "select",
        options: [
          { value: "iniciante", label: "Iniciante" },
          { value: "intermediario", label: "Intermediário" },
          { value: "avancado", label: "Avançado" },
        ],
        tab: "Informações",
      },
      { key: "versao", label: "Versão", type: "text", placeholder: "1.0.0", tab: "Informações" },

      { key: "system_prompt", label: "System Prompt", type: "textarea", tab: "Prompt" },
      { key: "instrucoes", label: "Instruções ao usuário", type: "textarea", tab: "Prompt" },

      {
        key: "provedor",
        label: "Provedor",
        type: "select",
        options: [
          { value: "google", label: "Google (Gemini)" },
          { value: "openai", label: "OpenAI" },
          { value: "anthropic", label: "Anthropic" },
          { value: "meta", label: "Meta" },
          { value: "outros", label: "Outros" },
        ],
        tab: "IA",
      },
      { key: "modelo", label: "Modelo", type: "text", placeholder: "gemini-2.5-flash", tab: "IA" },
      { key: "temperatura", label: "Temperatura", type: "number", step: 0.1, tab: "IA" },
      { key: "max_tokens", label: "Máx. tokens", type: "number", tab: "IA" },
      { key: "capabilities", label: "Capacidades (vírgulas)", type: "array", tab: "IA" },
      { key: "tools", label: "Ferramentas (vírgulas)", type: "array", tab: "IA" },
      { key: "compatibilidade", label: "Compatibilidade (vírgulas)", type: "array", tab: "IA" },

      { key: "cover_url", label: "Capa", type: "image", tab: "Arquivos" },
      { key: "tags", label: "Tags (vírgulas)", type: "array", tab: "Arquivos" },

      {
        key: "ativo",
        label: "Publicado (visível para clientes)",
        type: "boolean",
        tab: "Publicação",
      },
      { key: "destaque", label: "Em destaque", type: "boolean", tab: "Publicação" },
      { key: "oculto", label: "Oculto", type: "boolean", tab: "Publicação" },
      { key: "visible_mobile", label: "Visível no mobile", type: "boolean", tab: "Publicação" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "categoria", label: "Categoria" },
      { key: "modelo", label: "Modelo" },
      { key: "ativo", label: "Publicado", format: "boolean" },
      { key: "destaque", label: "Destaque", format: "boolean" },
      { key: "created_at", label: "Criado", format: "date" },
    ],
  },

  // =========================================================================
  // PROMPTS — catálogo do painel de Prompts
  // =========================================================================
  {
    key: "ai-prompts",
    label: "Prompts",
    singular: "Prompt",
    table: "ai_prompts",
    icon: Sparkles,
    group: "Comercial",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["titulo", "categoria"],
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true, tab: "Informações" },
      { key: "descricao", label: "Descrição", type: "textarea", tab: "Informações" },
      { key: "categoria", label: "Categoria", type: "text", tab: "Informações" },
      { key: "subcategoria", label: "Subcategoria", type: "text", tab: "Informações" },
      { key: "autor", label: "Autor", type: "text", tab: "Informações" },
      {
        key: "nivel",
        label: "Nível",
        type: "select",
        options: [
          { value: "iniciante", label: "Iniciante" },
          { value: "intermediario", label: "Intermediário" },
          { value: "avancado", label: "Avançado" },
        ],
        tab: "Informações",
      },
      { key: "versao", label: "Versão", type: "text", tab: "Informações" },

      { key: "prompt", label: "Prompt completo", type: "textarea", required: true, tab: "Prompt" },

      {
        key: "compatibilidade",
        label: "Compatibilidade (ChatGPT, Gemini, Claude...)",
        type: "array",
        tab: "IA",
      },
      { key: "tags", label: "Tags (vírgulas)", type: "array", tab: "IA" },

      { key: "cover_url", label: "Capa", type: "image", tab: "Arquivos" },

      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "rascunho", label: "Rascunho" },
          { value: "publicado", label: "Publicado" },
          { value: "arquivado", label: "Arquivado" },
        ],
        tab: "Publicação",
      },
      {
        key: "ativo",
        label: "Publicado (visível para clientes)",
        type: "boolean",
        tab: "Publicação",
      },
      { key: "destaque", label: "Em destaque", type: "boolean", tab: "Publicação" },
      { key: "oculto", label: "Oculto", type: "boolean", tab: "Publicação" },
      { key: "mostrar_premium", label: "Mostrar em Premium", type: "boolean", tab: "Publicação" },
      { key: "mostrar_tv", label: "Mostrar em TV", type: "boolean", tab: "Publicação" },
      {
        key: "mostrar_seguidores",
        label: "Mostrar em Seguidores",
        type: "boolean",
        tab: "Publicação",
      },
      { key: "visible_mobile", label: "Visível no mobile", type: "boolean", tab: "Publicação" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "categoria", label: "Categoria" },
      { key: "status", label: "Status" },
      { key: "ativo", label: "Publicado", format: "boolean" },
      { key: "destaque", label: "Destaque", format: "boolean" },
      { key: "created_at", label: "Criado", format: "date" },
    ],
  },

  // =========================================================================
  // PACKS PREMIUM
  // =========================================================================
  {
    key: "premium-packs",
    label: "Packs",
    singular: "Pack",
    table: "premium_packs",
    icon: Package,
    group: "Comercial",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["nome", "slug"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true, tab: "Informações" },
      { key: "slug", label: "Slug (URL)", type: "text", required: true, tab: "Informações" },
      { key: "categoria", label: "Categoria", type: "text", tab: "Informações" },
      { key: "descricao_curta", label: "Descrição curta", type: "textarea", tab: "Informações" },
      {
        key: "descricao_completa",
        label: "Descrição completa",
        type: "textarea",
        tab: "Informações",
      },
      { key: "autor", label: "Autor", type: "text", tab: "Informações" },
      { key: "versao", label: "Versão", type: "text", tab: "Informações" },
      { key: "observacoes", label: "Observações", type: "textarea", tab: "Informações" },

      { key: "compatibilidade", label: "Compatibilidade (vírgulas)", type: "array", tab: "IA" },
      { key: "tags", label: "Tags (vírgulas)", type: "array", tab: "IA" },

      { key: "banner_url", label: "Banner", type: "image", tab: "Arquivos" },
      { key: "capa_url", label: "Capa", type: "image", tab: "Arquivos" },
      { key: "icone_url", label: "Ícone", type: "image", tab: "Arquivos" },
      { key: "video_url", label: "Vídeo (URL)", type: "text", tab: "Arquivos" },
      {
        key: "source_type",
        label: "Tipo da fonte",
        type: "select",
        options: [
          { value: "google_drive", label: "Google Drive" },
          { value: "mega", label: "Mega" },
          { value: "dropbox", label: "Dropbox" },
          { value: "storage", label: "Lovable Cloud Storage" },
          { value: "external", label: "Link externo" },
        ],
        tab: "Arquivos",
      },
      {
        key: "drive_url",
        label: "Link do Google Drive (pasta ou arquivo)",
        type: "text",
        tab: "Arquivos",
        placeholder: "https://drive.google.com/…",
        helperText: "Abre dentro da plataforma via visualizador embutido.",
      },
      {
        key: "archive_url",
        label: "Arquivo compactado (.zip/.rar)",
        type: "file",
        tab: "Arquivos",
        accept:
          ".zip,.rar,.7z,.tar,.gz,application/zip,application/x-rar-compressed,application/x-7z-compressed",
        helperText: "Enviado ao armazenamento interno. Clientes baixam direto sem sair do app.",
      },
      { key: "qtd_arquivos", label: "Qtd. de arquivos", type: "number", tab: "Arquivos" },
      { key: "espaco_bytes", label: "Espaço (bytes)", type: "number", tab: "Arquivos" },

      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "rascunho", label: "Rascunho" },
          { value: "publicado", label: "Publicado" },
          { value: "arquivado", label: "Arquivado" },
        ],
        tab: "Publicação",
      },
      {
        key: "visibility_status",
        label: "Visibilidade",
        type: "select",
        options: [
          { value: "public", label: "Público" },
          { value: "unlisted", label: "Não listado" },
          { value: "private", label: "Privado" },
        ],
        tab: "Publicação",
      },
      { key: "allow_view", label: "Permite visualizar", type: "boolean", tab: "Publicação" },
      { key: "allow_download", label: "Permite download", type: "boolean", tab: "Publicação" },
      {
        key: "is_shareable",
        label: "Compartilhável (link público)",
        type: "boolean",
        tab: "Publicação",
      },
      { key: "destaque", label: "Em destaque", type: "boolean", tab: "Publicação" },
      {
        key: "sales_platform",
        label: "Plataforma de venda",
        type: "select",
        options: [
          { value: "kiwify", label: "Kiwify" },
          { value: "hotmart", label: "Hotmart" },
          { value: "eduzz", label: "Eduzz" },
          { value: "cakto", label: "Cakto" },
          { value: "mercadopago", label: "Mercado Pago" },
          { value: "outros", label: "Outros" },
        ],
        tab: "Publicação",
      },
      { key: "sales_product_id", label: "Link de venda (URL)", type: "text", tab: "Publicação" },
      { key: "ordem", label: "Ordem de exibição", type: "number", tab: "Publicação" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "categoria", label: "Categoria" },
      { key: "status", label: "Status" },
      { key: "allow_download", label: "Download", format: "boolean" },
      { key: "destaque", label: "Destaque", format: "boolean" },
      { key: "created_at", label: "Criado", format: "date" },
    ],
  },
  {
    key: "comunicacao",
    label: "Central de Comunicação",
    singular: "Campanha",
    table: "mensagens_campanhas",
    icon: Megaphone,
    group: "Sistema",
    orderBy: { column: "created_at", ascending: false },
    searchColumns: ["titulo", "mensagem"],
    fields: [
      { key: "titulo", label: "Título interno", type: "text", required: true },
      { key: "mensagem", label: "Mensagem", type: "textarea", required: true, helperText: "Suporta {nome}, {email}, {chave} — substituição no envio futuro." },
      {
        key: "canal",
        label: "Canal",
        type: "select",
        required: true,
        options: [
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "E-mail" },
          { value: "notificacao", label: "Notificação no app" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "rascunho", label: "Rascunho" },
          { value: "pronta_para_envio", label: "Pronta para envio" },
          { value: "enviada", label: "Enviada" },
          { value: "cancelada", label: "Cancelada" },
        ],
      },
      {
        key: "revendedor_id",
        label: "Filtrar por revendedor",
        type: "select_from_table",
        fromTable: { table: "revendedores", labelKey: "nome" },
      },
      {
        key: "produto_id",
        label: "Filtrar por produto",
        type: "select_from_table",
        fromTable: { table: "produtos", labelKey: "nome" },
      },
      {
        key: "plano_status",
        label: "Filtrar por status do plano",
        type: "select",
        options: [
          { value: "ativo", label: "Ativos" },
          { value: "expirado", label: "Expirados" },
          { value: "teste", label: "Em teste" },
          { value: "cancelado", label: "Cancelados" },
        ],
      },
      { key: "destinatarios_previstos", label: "Destinatários previstos", type: "number" },
      { key: "agendada_para", label: "Agendar para", type: "datetime" },
      { key: "observacoes", label: "Observações internas", type: "textarea" },
    ],
    listColumns: [
      { key: "titulo", label: "Título" },
      { key: "canal", label: "Canal" },
      { key: "status", label: "Status" },
      { key: "destinatarios_previstos", label: "Destinatários", format: "number" },
      { key: "agendada_para", label: "Agendada", format: "date" },
      { key: "created_at", label: "Criada", format: "date" },
    ],
  },
  {
    key: "extensoes",
    label: "Extensões (Config)",
    singular: "Extensão",
    table: "extensao_configs",
    icon: Boxes,
    group: "Comercial",
    orderBy: { column: "ordem", ascending: true },
    searchColumns: ["nome", "versao"],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      {
        key: "produto_id",
        label: "Produto de licença vinculado",
        type: "select_from_table",
        fromTable: { table: "licenca_produtos", labelKey: "nome" },
      },
      { key: "imagem", label: "Imagem", type: "image" },
      { key: "versao", label: "Versão", type: "text", helperText: "Ex.: 1.2.3" },
      { key: "descricao", label: "Descrição", type: "textarea" },
      { key: "dias_padrao", label: "Dias padrão", type: "number" },
      { key: "minutos_teste", label: "Tempo de teste (min)", type: "number" },
      { key: "dias_premium", label: "Dias Premium", type: "number", helperText: "Vazio = vitalício" },
      { key: "dias_adicionais", label: "Dias adicionais", type: "number" },
      { key: "dias_promocionais", label: "Dias promocionais", type: "number" },
      { key: "msg_ativacao", label: "Mensagem de ativação", type: "textarea" },
      { key: "msg_expiracao", label: "Mensagem de expiração", type: "textarea" },
      { key: "msg_bloqueio", label: "Mensagem de bloqueio", type: "textarea" },
      { key: "msg_atualizacao", label: "Mensagem de atualização", type: "textarea" },
      { key: "link_manual", label: "Link do manual", type: "text" },
      { key: "link_download", label: "Link de download", type: "text" },
      { key: "link_drive", label: "Link Google Drive", type: "text" },
      { key: "link_zip", label: "Link ZIP", type: "text" },
      { key: "link_rar", label: "Link RAR", type: "text" },
      { key: "url_atualizacao", label: "URL de atualização", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ativa", label: "Ativa" },
          { value: "oculta", label: "Oculta" },
          { value: "manutencao", label: "Em manutenção" },
        ],
      },
      { key: "ordem", label: "Ordem", type: "number" },
    ],
    listColumns: [
      { key: "nome", label: "Nome" },
      { key: "versao", label: "Versão" },
      { key: "status", label: "Status" },
      { key: "dias_padrao", label: "Dias", format: "number" },
      { key: "updated_at", label: "Atualizada", format: "date" },
    ],
  },
];

export { Store };
export const resourceByKey = new Map(resources.map((r) => [r.key, r]));
