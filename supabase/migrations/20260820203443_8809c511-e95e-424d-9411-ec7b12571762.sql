
DROP VIEW IF EXISTS public.admin_branding;

CREATE OR REPLACE FUNCTION public.get_admin_branding()
RETURNS TABLE (
  site_name text,
  logo_url text,
  favicon_url text,
  primary_color text,
  accent_color text,
  welcome_text text,
  footer_text text,
  notification_message text,
  notification_active boolean,
  link_comunidade text,
  painel_revendedor_valor numeric,
  kiwify_checkout_url_revendedor text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT site_name, logo_url, favicon_url, primary_color, accent_color,
         welcome_text, footer_text, notification_message, notification_active,
         link_comunidade, painel_revendedor_valor, kiwify_checkout_url_revendedor
  FROM public.admin_settings
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_admin_branding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_branding() TO authenticated, service_role;
