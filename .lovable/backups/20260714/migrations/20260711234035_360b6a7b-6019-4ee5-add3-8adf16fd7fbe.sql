
-- Planos: substituir benefícios que citam créditos
UPDATE public.planos SET beneficios = to_jsonb(ARRAY[
  'Acesso aos recursos do plano',
  'Atualizações constantes',
  'Suporte por e-mail',
  'Biblioteca exclusiva',
  'Área de membros'
]) WHERE nome = 'Starter';

UPDATE public.planos SET beneficios = to_jsonb(ARRAY[
  'Acesso completo aos recursos do plano',
  'Atualizações constantes',
  'Suporte prioritário no WhatsApp',
  'Biblioteca exclusiva',
  'Área de membros',
  'Novos conteúdos periódicos'
]) WHERE nome = 'Profissional';

UPDATE public.planos SET beneficios = to_jsonb(ARRAY[
  'Acesso total à plataforma',
  'Atualizações constantes',
  'Suporte VIP conforme o plano contratado',
  'Área de membros premium',
  'Novos conteúdos periódicos',
  'Consultoria estratégica'
]) WHERE nome = 'Enterprise';

-- Promoções: trocar os 3 cards de "Pacote X Créditos" por produtos reais
UPDATE public.promocoes
SET titulo = 'Agente IA Premium',
    descricao = 'Automação inteligente para acelerar suas vendas',
    subtitulo = 'Agentes IA',
    botao_texto = 'Ver Agentes'
WHERE titulo = 'Pacote 100 Créditos';

UPDATE public.promocoes
SET titulo = 'Pack de Prompts Profissionais',
    descricao = 'Modelos prontos para marketing, vendas e conteúdo',
    subtitulo = 'Prompts Premium',
    botao_texto = 'Ver Prompts'
WHERE titulo = 'Pacote 500 Créditos';

UPDATE public.promocoes
SET titulo = 'Biblioteca de Extensões',
    descricao = 'Ferramentas exclusivas para escalar seu negócio',
    subtitulo = 'Extensões',
    botao_texto = 'Ver Extensões'
WHERE titulo = 'Pacote 1000 Créditos';

-- Carrossel: remover créditos/IPTV/ativação automática
UPDATE public.carrossel_slides
SET titulo = '🔥 Destaques da Semana',
    subtitulo = 'Agentes, Prompts e Packs em alta'
WHERE titulo ILIKE '%Promoção Relâmpago%' OR subtitulo ILIKE '%crédito%';

UPDATE public.carrossel_slides
SET titulo = '⚡ Novos Agentes IA',
    subtitulo = 'Confira os lançamentos da semana'
WHERE titulo ILIKE '%IPTV%' OR titulo ILIKE '%Aplicativo%';

UPDATE public.carrossel_slides
SET titulo = '💎 Plano Premium',
    subtitulo = 'Acesso completo por 12 meses'
WHERE titulo ILIKE '%Plano Premium%';

UPDATE public.carrossel_slides
SET titulo = '🎁 Bônus na 1ª compra',
    subtitulo = 'Conteúdos exclusivos liberados no primeiro acesso'
WHERE subtitulo ILIKE '%crédito%' OR titulo ILIKE '%Bônus%';

UPDATE public.carrossel_slides
SET titulo = '🚀 Transformação Digital',
    subtitulo = 'Escale seu negócio com IA'
WHERE subtitulo ILIKE '%Ativação%' OR titulo ILIKE '%Ativação%';

-- Banners
UPDATE public.banners
SET titulo = 'Pack Premium',
    subtitulo = 'Curadoria exclusiva com o melhor custo-benefício'
WHERE titulo ILIKE '%Crédito%' OR subtitulo ILIKE '%crédito%';

UPDATE public.banners
SET titulo = 'Agentes IA Premium',
    subtitulo = 'Acesso completo + suporte dedicado'
WHERE titulo ILIKE '%IPTV%';

-- Propagandas: remover "Garantia de 7 dias"
UPDATE public.propagandas
SET titulo = 'Entrega após confirmação',
    texto = 'Acesso liberado assim que o pagamento for confirmado'
WHERE titulo ILIKE '%Garantia%' OR texto ILIKE '%Reembolso%';

-- Varredura final: qualquer texto residual com "crédito"
UPDATE public.carrossel_slides
SET titulo = regexp_replace(titulo, '[Cc]r[eé]ditos?', 'acessos', 'g'),
    subtitulo = regexp_replace(coalesce(subtitulo,''), '[Cc]r[eé]ditos?', 'acessos', 'g'),
    descricao = regexp_replace(coalesce(descricao,''), '[Cc]r[eé]ditos?', 'acessos', 'g')
WHERE titulo ~* 'cr[eé]dito' OR subtitulo ~* 'cr[eé]dito' OR descricao ~* 'cr[eé]dito';

UPDATE public.banners
SET titulo = regexp_replace(titulo, '[Cc]r[eé]ditos?', 'acessos', 'g'),
    subtitulo = regexp_replace(coalesce(subtitulo,''), '[Cc]r[eé]ditos?', 'acessos', 'g'),
    descricao = regexp_replace(coalesce(descricao,''), '[Cc]r[eé]ditos?', 'acessos', 'g')
WHERE titulo ~* 'cr[eé]dito' OR subtitulo ~* 'cr[eé]dito' OR descricao ~* 'cr[eé]dito';

UPDATE public.promocoes
SET titulo = regexp_replace(titulo, '[Cc]r[eé]ditos?', 'acessos', 'g'),
    descricao = regexp_replace(coalesce(descricao,''), '[Cc]r[eé]ditos?', 'acessos', 'g'),
    subtitulo = regexp_replace(coalesce(subtitulo,''), '[Cc]r[eé]ditos?', 'acessos', 'g')
WHERE titulo ~* 'cr[eé]dito' OR descricao ~* 'cr[eé]dito' OR subtitulo ~* 'cr[eé]dito';
