
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notificar_licencas_expirando()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
  _r record;
  _dias integer;
  _tag text;
BEGIN
  FOR _r IN
    SELECT l.id, l.revendedor_id, l.chave, l.expira_em, l.cliente_id
      FROM public.licencas l
     WHERE l.status = 'ativa'
       AND l.expira_em IS NOT NULL
       AND l.revendedor_id IS NOT NULL
       AND (
            (l.expira_em::date - now()::date) = 7
         OR (l.expira_em::date - now()::date) = 1
       )
  LOOP
    _dias := (_r.expira_em::date - now()::date);
    _tag := 'expira_' || _dias || 'd_' || _r.id::text;

    -- evita duplicar: só cria se não existir notificação com essa tag nas últimas 24h
    IF NOT EXISTS (
      SELECT 1 FROM public.notificacoes n
       WHERE n.revendedor_id = _r.revendedor_id
         AND n.categoria = 'licenca'
         AND n.link = '/licencas'
         AND (n.metadata->>'tag') = _tag
         AND n.created_at > now() - interval '48 hours'
    ) THEN
      INSERT INTO public.notificacoes(
        titulo, mensagem, tipo, destino, categoria,
        revendedor_id, link, metadata
      ) VALUES (
        CASE WHEN _dias = 1 THEN 'Licença expira amanhã' ELSE 'Licença expira em 7 dias' END,
        format('A licença %s expira em %s dia(s).', _r.chave, _dias),
        'aviso',
        'revendedor',
        'licenca',
        _r.revendedor_id,
        '/licencas',
        jsonb_build_object('tag', _tag, 'licenca_id', _r.id, 'dias', _dias)
      );
      _count := _count + 1;
    END IF;
  END LOOP;

  RETURN _count;
END;
$$;
