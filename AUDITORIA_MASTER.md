# AUDITORIA MASTER MR SEM LIMITES — NOVO AMBIENTE

## A. STATUS GERAL
O novo ambiente está operacional, com frontend TanStack Start v1 reconstruído e conectado ao novo Supabase. A estrutura base do banco de dados e as APIs da extensão foram migradas e estão funcionais, porém com dados iniciais mínimos. O sistema está pronto para evoluir para o conceito "MR Central".

## B. GITHUB
- **Repositório:** Conectado (ambiente Lovable sandbox).
- **Estrutura:** Frontend TanStack Router (`src/routes`), Backend (`src/routes/api`), Migrations (`supabase/migrations` e `.lovable/backups`).
- **Originalidade:** O código reflete a estrutura premium do MR Sem Limites, com módulos de agentes, prompts e painel administrativo completo.
- **Secrets:** Detectados em `.env` e `src/integrations/supabase/types.ts` (devidamente protegidos/mascarados no log).

## C. NOVO SUPABASE
- **Status:** Conectado e ativo.
- **Tabelas:** 50+ tabelas migradas (clientes, licencas, produtos, etc.).
- **Funções/RPC:** `heartbeat_licenca`, `consulta_licenca_publica`, `gerar_chave_licenca`, `log_audit` e `has_role` existentes.
- **Storage:** Buckets `admin-media`, `extension-releases`, `extensao`, `user-uploads`, `premium-covers` identificados.
- **RLS:** Ativado na maioria das tabelas, com políticas baseadas em `has_role(auth.uid(), 'admin')`.

## D. BANCO DE DADOS
- **Existente:** Estrutura completa para MR Sem Limites (licenças, dispositivos, produtos, clientes, pagamentos).
- **Relacionamentos:** Foreign keys ativas entre `licencas`, `clientes` e `dispositivos`.
- **Falta/Pendente (MR Central):** Tabelas `products`, `product_versions`, `license_features` ainda não seguem o padrão multi-produto centralizado; o schema atual é focado no produto MR-SL.

## E. AUTENTICAÇÃO
- **Sistema:** Supabase Auth integrado com `public.user_roles`.
- **Roles:** Enum `app_role` ('admin', 'user') presente.
- **Proteção:** `auth-middleware.ts` e `RequireAuth` configurados no frontend.

## F. ULTRA ADMIN
- **Usuário:** `mariocftv@gmail.com` detectado no código (`useIsAdmin.ts`) como administrador hardcoded.
- **Role DB:** O usuário ainda não possui a role `admin` na tabela `user_roles` do novo banco.
- **Status:** PARCIAL (Reconhecido pelo código, mas sem privilégios no DB).

## G. LICENÇAS
- **Endpoints:** `POST /api/public/ext/functions.v1.validate-license-v2` e `POST /api/public/licenca/heartbeat` ativos.
- **Lógica:** Implementada via RPC no banco de dados.
- **HWID:** Sistema de vinculação de dispositivo (`licenca_dispositivos`) presente.

## H. EXTENSÃO
- **Integração:** Arquivos em `src/routes/api/public/ext` preparados.
- **Backend:** Apontando corretamente para o novo ambiente via variáveis de ambiente.
- **Resíduos:** Encontradas referências à logo antiga no storage legacy em `src/components/brand.tsx`.

## I. STORAGE
- **Buckets:** `extension-releases` (Privado), `admin-media` (Público), `premium-covers` (Público).
- **Políticas:** RLS configurado para permitir leitura pública em buckets de mídia e escrita apenas para admins.

## J. API/BACKEND
- **Arquitetura:** TanStack Start Server Functions e API Routes.
- **Webhooks:** Handlers para Kiwify, Cakto e MercadoPago em `src/routes/api/public/webhooks`.

## K. PAINEL
- **Status:** FUNCIONAL.
- **Módulos:** Dashboard, Gestão de Clientes, Licenças, Revendedores e Loja de Produtos visíveis e roteados.
- **Visual:** Identidade premium aplicada com Glassmorphism e Dark Theme.

## L. MR CENTRAL
- **Estrutura:** `system_modules` e `admin_settings` presentes, mas a lógica de múltiplos `product_id` em licenças ainda é embrionária.

## M. AGENTES E OUTROS PRODUTOS
- **AI Agents:** Tabelas `ai_agents` e `ai_prompts` com estrutura robusta de metadados.
- **Compatibilidade:** Preparado para múltiplos modelos e provedores.

## N. DIFERENÇAS ENTRE ANTIGO E NOVO
- **Novo:** TanStack Start v1 (SSR nativo), estrutura de pastas simplificada, migrations consolidadas.
- **Antigo:** Referências a domínios Supabase legados em alguns comentários e componentes de marca.

## O. RISCOS
- **Admin Role:** Sem o insert em `user_roles`, o acesso administrativo total via RLS está bloqueado.
- **Legacy URLs:** Algumas imagens em `brand.tsx` e `PackCover.tsx` podem falhar se os arquivos não forem movidos para o novo storage.

## P. PENDÊNCIAS
- [ ] Atribuição da role `admin` ao usuário master.
- [ ] Migração de arquivos de mídia (logos/banners) para os novos buckets.
- [ ] Teste de ponta a ponta com a extensão física.

## Q. O QUE PRECISA SER MIGRADO
- Dados históricos de licenças (se desejado).
- Arquivos de configuração da extensão do storage antigo.

## R. O QUE NÃO DEVE SER MIGRADO
- Arquivos `.git` e configurações de ambiente legadas.
- Código de backends não-TanStack.

## S. PLANO DE EXECUÇÃO RECOMENDADO (FASE 2)
1. Efetivar a role `admin` para `mariocftv@gmail.com`.
2. Configurar os `admin_settings` iniciais via painel.
3. Subir os assets de marca (logo/favicon) para o novo Supabase.
4. Validar o fluxo de webhook de pagamento com um sandbox.

## T. STATUS FINAL
**AUDITORIA CONCLUÍDA — AMBIENTE PRONTO PARA CONFIGURAÇÃO FINAL.**
