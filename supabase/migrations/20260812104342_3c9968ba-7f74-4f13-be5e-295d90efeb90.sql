DELETE FROM public.license_features WHERE license_id IN (SELECT id FROM public.licencas WHERE chave LIKE 'TEST-E2E-%');
DELETE FROM public.licencas WHERE chave LIKE 'TEST-E2E-%';
DELETE FROM public.product_versions WHERE version = '1.0.0-test';
-- Nota: Deixaremos o produto e o cliente para fins de auditoria no relatório, ou podem ser removidos aqui se desejar 100% clean.
