-- Sincronizar produtos de teste para as duas tabelas de produtos detectadas
DO $$ 
DECLARE 
    v_prod_id UUID;
    v_cli_id UUID;
    v_lic_id UUID;
BEGIN 
    -- 1. Criar Produto em public.produtos
    IF NOT EXISTS (SELECT 1 FROM public.produtos WHERE slug = 'mr-sl-teste') THEN
        INSERT INTO public.produtos (id, nome, slug, status, created_at)
        VALUES (gen_random_uuid(), 'MR-SL-TESTE', 'mr-sl-teste', 'ativo', now())
        RETURNING id INTO v_prod_id;
    ELSE
        SELECT id INTO v_prod_id FROM public.produtos WHERE slug = 'mr-sl-teste';
    END IF;

    -- 2. Espelhar/Garantir em public.licenca_produtos (se existir e for a referência da FK)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licenca_produtos' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM public.licenca_produtos WHERE id = v_prod_id) THEN
            INSERT INTO public.licenca_produtos (id, nome, slug, created_at)
            VALUES (v_prod_id, 'MR-SL-TESTE', 'mr-sl-teste', now())
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;

    -- 3. Criar Versão
    IF NOT EXISTS (SELECT 1 FROM public.product_versions WHERE product_id = v_prod_id AND version = '1.0.0-test') THEN
        INSERT INTO public.product_versions (id, product_id, version, changelog, is_critical, created_at)
        VALUES (gen_random_uuid(), v_prod_id, '1.0.0-test', 'Changelog de homologação', false, now());
    END IF;

    -- 4. Criar Cliente
    IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE email = 'homologacao@mr.com') THEN
        INSERT INTO public.clientes (id, nome, email, created_at)
        VALUES (gen_random_uuid(), 'Cliente Homologação MR', 'homologacao@mr.com', now())
        RETURNING id INTO v_cli_id;
    ELSE
        SELECT id INTO v_cli_id FROM public.clientes WHERE email = 'homologacao@mr.com';
    END IF;

    -- 5. Criar Licença Ativa
    IF NOT EXISTS (SELECT 1 FROM public.licencas WHERE chave = 'TEST-E2E-ACTIVE-KEY') THEN
        INSERT INTO public.licencas (id, cliente_id, produto_id, chave, status, expira_em, max_dispositivos, created_at)
        VALUES (gen_random_uuid(), v_cli_id, v_prod_id, 'TEST-E2E-ACTIVE-KEY', 'ativa', now() + interval '30 days', 2, now())
        RETURNING id INTO v_lic_id;
        
        -- Adicionar features de teste
        INSERT INTO public.license_features (license_id, feature_name, feature_value)
        VALUES 
            (v_lic_id, 'max_agents', '10'::jsonb),
            (v_lic_id, 'allow_proxy', 'true'::jsonb);
    END IF;

    -- 6. Criar Licença Bloqueada
    IF NOT EXISTS (SELECT 1 FROM public.licencas WHERE chave = 'TEST-E2E-BLOCKED-KEY') THEN
        INSERT INTO public.licencas (id, cliente_id, produto_id, chave, status, expira_em, max_dispositivos, created_at)
        VALUES (gen_random_uuid(), v_cli_id, v_prod_id, 'TEST-E2E-BLOCKED-KEY', 'bloqueada', now() + interval '30 days', 1, now());
    END IF;

END $$;
