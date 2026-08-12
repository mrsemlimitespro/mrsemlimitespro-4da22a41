# Plano de Consolidação MR CENTRAL

## 1. Ultra Admin e Segurança
- [ ] Verificar e garantir que `mariocftv@gmail.com` tenha a role `admin` no Supabase Auth e na tabela `public.user_roles`.
- [ ] Validar políticas RLS para garantir que apenas admins acessem tabelas sensíveis.

## 2. Modelagem MR CENTRAL (Schema)
Adaptação das tabelas existentes para o modelo multi-produto:
- **Produtos:** Reaproveitar `public.produtos`, adicionando o campo `slug` se necessário.
- **Versões:** Criar `public.product_versions` relacionada a `public.produtos`.
- **Licenças:** Adaptar `public.licencas` para incluir `product_id` (FK para `produtos`).
- **Recursos:** Criar `public.license_features`.
- **HWID:** Reaproveitar `public.licenca_dispositivos`.

## 3. API e Endpoints
- [ ] Manter retrocompatibilidade em `/api/public/ext/functions.v1.validate-license-v2`.
- [ ] Preparar novos endpoints em `/api/public/license/*` para a estrutura unificada.

## 4. Painel Administrativo
- [ ] Reorganizar o menu lateral para focar no "MR CENTRAL".
- [ ] Ocultar módulos redundantes ou não utilizados (ex: Revendedores se for o caso, ou agrupar sob Comercial).

## 5. Auditoria de Storage
- [ ] Mapear buckets em uso e referências no código.
- [ ] Garantir que todos os assets apontem para o novo Supabase.

---
**IMPORTANTE:** Sem migração de dados históricos. Foco total em arquitetura e segurança.
