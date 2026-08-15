# Relatório de Inspeção Técnica: ITEM 3 — Isolamento Multiempresa

## 1. Verificação de Entidades Existentes (Audit)

A consulta ao banco de dados e ao sistema de arquivos confirmou:

*   **Tabelas Existentes Relacionadas:** `dispositivos` (usada para licenças), `revendedores`, `clientes`, `user_roles`.
*   **Ausência de Conflitos:** Não foram encontradas tabelas chamadas `tenants`, `workspaces`, `tenant_members`, `workspace_members`, `leads`, `campanhas`, `queues` ou `whatsapp_instances` no schema `public`.
*   **Infraestrutura de Webhooks:** Já existem rotas para Kiwify, Cakto e Mercado Pago, mas são focadas em processamento de vendas, não em isolamento de dados por empresa.
*   **Arquivos Identificados:** O arquivo `src/lib/audit-revised.functions.ts` já faz referência a tabelas de 'tenants' e 'campanhas' em um contexto de auditoria, confirmando que a arquitetura está sendo preparada para este ITEM 3.

---

## 2. Modelo Canônico Proposto

**Conceito Unificado: `Workspace`**
Para evitar a duplicidade entre "Tenant" e "Workspace", utilizaremos o termo **Workspace** como a entidade raiz de isolamento.
*   **Workspace Pessoal:** Criado automaticamente no primeiro login do usuário (idempotente).
*   **Workspace Empresarial:** Criado sob demanda pelo usuário (Proprietário).

---

## 3. Schema das Tabelas (Fase 0)

### Tabela: `public.workspaces`
Armazena a entidade isoladora raiz.
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | PK (gen_random_uuid()) |
| `name` | `text` | Nome da empresa ou "Pessoal de [Nome]" |
| `slug` | `text` | Identificador único para URLs |
| `owner_id` | `uuid` | Referência a `auth.users(id)` |
| `type` | `text` | 'personal' ou 'business' |
| `created_at` | `timestamptz` | default now() |

### Tabela: `public.workspace_members`
Associa usuários a múltiplos workspaces.
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK `workspaces(id)` ON DELETE CASCADE |
| `user_id` | `uuid` | FK `auth.users(id)` ON DELETE CASCADE |
| `role` | `app_role` | 'owner', 'admin', 'member' |
| `invited_by` | `uuid` | Quem convidou |
| `status` | `text` | 'pending', 'active' |

---

## 4. Segurança e RLS (Políticas Completas)

### Funções de Segurança (Security Definer)
Para evitar recursão infinita e garantir performance:

```sql
CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS TABLE(workspace_id uuid) 
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active';
$$;
```

### Políticas para Workspaces
*   **SELECT:** `USING (id IN (SELECT get_user_workspaces()))`
*   **INSERT:** `WITH CHECK (auth.uid() IS NOT NULL)` (Limitado via Trigger/Function a 1 pessoal + N empresariais)
*   **UPDATE/DELETE:** `USING (owner_id = auth.uid())`

### Políticas para Dados (Ex: WhatsApp, Contatos)
Todas as tabelas de dados deverão ter `workspace_id uuid NOT NULL`.
*   **ALL:** `USING (workspace_id IN (SELECT get_user_workspaces()))`

---

## 5. Fluxos Idempotentes e Seguros

### Criação de Workspace Inicial
Server function `ensureInitialWorkspace`:
1. Verifica se o usuário já possui um workspace do tipo 'personal'.
2. Se não existir, cria o workspace e insere o usuário como `owner` na `workspace_members`.
3. Retorna o ID do workspace ativo.

### Convite de Membros
1. O Proprietário gera um link/token de convite atrelado ao `workspace_id`.
2. O convidado, ao aceitar, é inserido em `workspace_members` com status `pending`.
3. Apenas após confirmação o `status` torna-se `active`.

---

## 6. Estratégia de Migração e Testes

*   **Migração Aditiva:** Criação das tabelas sem tocar nos dados de licenças (`licencas`) e produtos (`produtos`) já existentes.
*   **Rollback:** Scripts `DROP TABLE` preparados para reverter a estrutura de workspaces.

### Teste de Isolamento (Cenário E2E)
1. **User A** (Workspace Alpha) insere um contato.
2. **User B** (Workspace Beta) tenta dar `SELECT` na tabela de contatos.
3. **Resultado Esperado:** User B recebe 0 linhas (Isolamento Absoluto via RLS).

---

## 7. Arquivos a serem alterados na próxima etapa
1. `supabase/migrations/` (Nova migração Fase 0)
2. `src/lib/workspaces.functions.ts` (Nova)
3. `src/hooks/useActiveWorkspace.ts` (Nova)
4. `src/routes/_app.tsx` (Integração do seletor de workspace)

**Aguardando autorização explícita: AUTORIZO FASE 0 — WORKSPACES.**
