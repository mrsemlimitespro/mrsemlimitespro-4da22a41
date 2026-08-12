ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS kiwify_checkout_url_revendedor text,
  ADD COLUMN IF NOT EXISTS kiwify_produto_revendedor_ref text;