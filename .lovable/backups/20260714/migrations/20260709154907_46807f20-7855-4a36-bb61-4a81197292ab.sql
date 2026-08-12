
CREATE OR REPLACE FUNCTION public.tg_licenca_tipo_transicao()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Ao converter para premium, limpar campos de teste e destravar validade
  IF NEW.tipo = 'premium' AND (OLD.tipo IS DISTINCT FROM 'premium') THEN
    NEW.trial_iniciado_em := NULL;
    NEW.trial_duracao_minutos := NULL;
    NEW.expira_em := NULL;
    IF NEW.status = 'expirada' THEN NEW.status := 'ativa'; END IF;
  END IF;

  -- Ao criar/mudar para teste, garantir max_dispositivos padrão 1 e limpar trial anterior se troca de licenca
  IF NEW.tipo = 'teste' AND (OLD.tipo IS DISTINCT FROM 'teste') THEN
    NEW.trial_iniciado_em := NULL; -- será gravado na primeira validação
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_licenca_tipo_transicao ON public.licencas;
CREATE TRIGGER trg_licenca_tipo_transicao
  BEFORE UPDATE ON public.licencas
  FOR EACH ROW EXECUTE FUNCTION public.tg_licenca_tipo_transicao();
