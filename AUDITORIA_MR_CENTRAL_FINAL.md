---
name: Auditoria MR Central V17 Final
description: Relatório de conformidade e status do backend consolidado para extensão v17.
type: feature
---

# AUDITORIA MR CENTRAL FINAL — V17

## 🟢 Status Geral: PRONTO PARA PRODUÇÃO

O backend do MR Central foi totalmente auditado e consolidado. Todas as rotas API requeridas pela extensão V17 estão operacionais e seguem padrões rigorosos de segurança.

### 1. Ambiente e Configurações
- **Domínio**: `https://mrsemlimites.lovable.app`
- **Helper Admin**: `src/integrations/supabase/client.server.ts` isolado com `supabaseAdmin`.
- **CORS**: Restrito para `MR_EXTENSION_ORIGIN` em produção.

### 2. Rotas API Consolidadas (`/api/ext/*`)
| Rota | Status | Segurança | Lógica |
| :--- | :--- | :--- | :--- |
| `validate-license` | 🟢 OK | RLS + Auditoria | Validação HWID e Sessão |
| `heartbeat` | 🟢 OK | RLS + Auditoria | Update `last_seen` sem duplicar |
| `send-command` | 🟢 OK | Proxy Real | Preserva `lastPayload`, chamada única upstream |
| `fix-stream` | 🟢 OK | SSE Proxy | Repasse de erros real (404/401/etc) |
| `upload` | 🟢 OK | Storage Privado | Limite 50MB, MIME check, Signed URL |

### 3. Banco de Dados e Migrations
- **Tabela `licencas`**: Esquema completo com suporte a trial e expiração.
- **Tabela `ext_sessions`**: Controle de HWID e concorrência de dispositivos.
- **Tabela `ext_requests`**: Auditoria sanitizada (segredos mascarados).
- **Storage**: Bucket `mr-ext-uploads` privado com políticas de acesso restritas.

### 4. Verificação de Build e Testes
- **Build**: `pnpm build` validado sem erros de importação ou alias.
- **Testes Unitários**: Suite `vitest` em `src/lib/mr-ext/*.test.ts` cobrindo lógica de chave e segurança.

### 5. Arquivos Modificados/Criados
- `src/integrations/supabase/client.server.ts`
- `src/lib/mr-ext/ext-api.server.ts`
- `src/routes/api/ext/*.ts`
- `supabase/migrations/20260819224500_v17_storage_fix.sql`
- `AUDITORIA_MR_CENTRAL_FINAL.md`

Este pacote representa a versão executável definitiva do projeto conectado ao GitHub.
