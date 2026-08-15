# Plano de Implementação: Fase 0 - Fundação Multi-tenant (MR Sem Limite Pro)

Este plano detalha a fundação técnica para a migração multi-tenant, focando em segurança, isolamento de dados e preservação do ecossistema atual.

## Objetivos
- Confirmar a inexistência de tabelas conflitantes via auditoria real.
- Estabelecer o schema `tenants` e `tenant_members` com RLS rigoroso.
- Garantir que a Evolution API opere apenas via Proxy Server-side.
- Manter o produto como **MR Sem Limite Pro**.

## Etapas Técnicas

### 1. Auditoria e Confirmação
- [ ] Executar `src/lib/audit-revised.functions.ts` para confirmar que `tenants`, `tenant_members`, `whatsapp_instances`, `leads` e `campanhas` não existem.
- [ ] Validar a integridade dos tipos gerados em `src/integrations/supabase/types.ts`.

### 2. Infraestrutura de Banco de Dados (SQL Pré-visualização)
- [ ] Criar função `SECURITY DEFINER` `get_user_tenants()` com `search_path` seguro.
- [ ] Implementar tabelas `tenants` e `tenant_members` com RLS habilitado.
- [ ] Aplicar políticas de SELECT/INSERT/UPDATE/DELETE baseadas em ownership e membership.

### 3. Segurança de Integração (Evolution API)
- [ ] Configurar variáveis de ambiente de servidor para `EVOLUTION_API_KEY` e `EVOLUTION_API_URL`.
- [ ] Criar `src/lib/whatsapp.functions.ts` como proxy server-side.
- [ ] Garantir que nenhum dado sensível (Tokens, QR Codes) seja persistido em tabelas públicas.

### 4. Experiência do Usuário e Transição
- [ ] Implementar lógica de criação idempotente do tenant inicial no primeiro acesso.
- [ ] Manter as rotas atuais (`/admin`, `/dashboard`) operacionais durante a transição.
- [ ] Renomear referências residuais para garantir a marca **MR Sem Limite Pro**.

## Detalhes de Segurança (RLS)
- O isolamento entre Empresa A e Empresa B será garantido por políticas que utilizam a função `get_user_tenants()`, impedindo qualquer vazamento de dados via ID de tenant manipulado pelo cliente.

## Rollback
- O rollback será estritamente manual, consistindo no `DROP` dos novos objetos criados, sem afetar as tabelas legadas do sistema.

## Riscos e Mitigações
- **Recursão em RLS:** Mitigado pelo uso de `SECURITY DEFINER` na função de ajuda.
- **Inconsistência de Leads:** Centralização na nova tabela `leads`, mantendo `crm_leads` (se existir) como referência legada inalterada nesta fase.
