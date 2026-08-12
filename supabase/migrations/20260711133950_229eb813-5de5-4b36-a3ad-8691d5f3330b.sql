
CREATE TABLE public.system_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  icone text NOT NULL DEFAULT 'Package',
  categoria text NOT NULL DEFAULT 'Outros',
  rota text,
  ordem integer NOT NULL DEFAULT 0,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  favorito boolean NOT NULL DEFAULT false,
  mostrar_dashboard boolean NOT NULL DEFAULT true,
  mostrar_sidebar boolean NOT NULL DEFAULT true,
  mostrar_home boolean NOT NULL DEFAULT true,
  mostrar_busca boolean NOT NULL DEFAULT true,
  roles jsonb NOT NULL DEFAULT '["admin"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_modules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_modules TO authenticated;
GRANT ALL ON public.system_modules TO service_role;

ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_modules"
  ON public.system_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_insert_modules"
  ON public.system_modules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_modules"
  ON public.system_modules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_modules"
  ON public.system_modules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_system_modules_updated_at
  BEFORE UPDATE ON public.system_modules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed dos módulos atuais
INSERT INTO public.system_modules (slug, nome, descricao, icone, categoria, rota, ordem, favorito) VALUES
  ('dashboard', 'Painel', 'Visão geral do sistema', 'LayoutDashboard', 'Administração', '/admin', 0, true),
  ('modulos', 'Módulos', 'Gerenciador de módulos do sistema', 'Blocks', 'Administração', '/admin/modulos', 1, true),
  ('configuracoes', 'Configurações Gerais', 'Configurações do sistema', 'Settings2', 'Configurações', '/admin/configuracoes', 10, false),
  ('personalizacao', 'Personalização', 'Aparência e branding', 'Palette', 'Configurações', '/admin/personalizacao', 11, false),
  ('animacoes', 'Animações', 'Efeitos e transições', 'Sparkles', 'Configurações', '/admin/animacoes', 12, false),
  ('sons', 'Sons', 'Efeitos sonoros', 'Volume2', 'Configurações', '/admin/sons', 13, false),
  ('usuarios', 'Usuários', 'Gerenciar contas', 'UserCircle', 'Administração', '/admin/usuarios', 20, false),
  ('loja', 'Loja', 'Vitrine da loja', 'Store', 'Loja', '/admin/loja', 30, false),
  ('loja-produtos', 'Produtos & Galeria', 'Editor premium de produtos', 'Package', 'Loja', '/admin/loja-produtos', 31, false),
  ('pagamentos', 'Pagamentos', 'Gateways e transações', 'CreditCard', 'Financeiro', '/admin/pagamentos', 40, false),
  ('ajustar-creditos', 'Ajustar Créditos', 'Ajuste manual de saldos', 'Coins', 'Financeiro', '/admin/ajustar-creditos', 41, false),
  ('seguranca', 'Segurança', 'Controle e auditoria', 'ShieldAlert', 'Segurança', '/admin/seguranca', 50, false),
  ('pack-autorizacoes', 'Autorizações de Packs', 'Liberação de packs', 'KeySquare', 'Segurança', '/admin/pack-autorizacoes', 51, false),
  ('backup', 'Backup', 'Cópias e restauração', 'DatabaseBackup', 'Sistema', '/admin/backup', 60, false),
  -- Recursos genéricos (resources.ts)
  ('licencas', 'Licenças', 'Chaves de licença', 'KeyRound', 'Administração', '/admin/licencas', 100, false),
  ('licenca_produtos', 'Produtos (Licenças)', 'Produtos que exigem licença', 'Package', 'Administração', '/admin/licenca_produtos', 101, false),
  ('clientes', 'Clientes', 'Base de clientes', 'Users', 'Administração', '/admin/clientes', 102, false),
  ('revendedores', 'Revendedores', 'Parceiros comerciais', 'UserCog', 'Administração', '/admin/revendedores', 103, false),
  ('produtos', 'Produtos', 'Catálogo da loja', 'Package', 'Loja', '/admin/produtos', 110, false),
  ('estoque', 'Estoque', 'Controle de estoque', 'Boxes', 'Loja', '/admin/estoque', 111, false),
  ('creditos', 'Créditos', 'Pacotes de créditos', 'Coins', 'Loja', '/admin/creditos', 112, false),
  ('planos', 'Planos', 'Assinaturas e planos', 'Sparkles', 'Loja', '/admin/planos', 113, false),
  ('promocoes', 'Promoções', 'Ofertas e cupons', 'Percent', 'Marketing', '/admin/promocoes', 120, false),
  ('carrossel', 'Carrossel', 'Slides da home', 'LayoutGrid', 'Marketing', '/admin/carrossel', 121, false),
  ('banners', 'Banners', 'Banners promocionais', 'LayoutGrid', 'Marketing', '/admin/banners', 122, false),
  ('propagandas', 'Propagandas', 'Anúncios internos', 'Megaphone', 'Marketing', '/admin/propagandas', 123, false),
  ('imagens', 'Upload de Imagens', 'Biblioteca de imagens', 'Image', 'Uploads', '/admin/imagens', 130, false),
  ('videos', 'Upload de Vídeos', 'Biblioteca de vídeos', 'Video', 'Uploads', '/admin/videos', 131, false),
  ('logos', 'Logos', 'Logos e marcas', 'Image', 'Configurações', '/admin/logos', 132, false),
  ('notificacoes', 'Notificações', 'Central de avisos', 'Bell', 'Sistema', '/admin/notificacoes', 140, false),
  ('aulas', 'Aulas', 'Videoaulas e cursos', 'GraduationCap', 'Conteúdo', '/admin/aulas', 150, false),
  ('ai-agents', 'Agentes IA', 'Agentes de IA', 'Sparkles', 'IA', '/admin/ai-agents', 160, false),
  ('ai-prompts', 'Prompts IA', 'Biblioteca de prompts', 'Sparkles', 'IA', '/admin/ai-prompts', 161, false),
  ('premium-packs', 'Packs Premium', 'Packs exclusivos', 'Package', 'Conteúdo', '/admin/premium-packs', 162, false);
