# Plano de Correção e Consolidação MR CENTRAL V17

O objetivo é garantir que o backend do MR Central esteja 100% funcional no domínio público, com todas as rotas API respondendo corretamente (sem 404), suíte de testes validando a lógica real, e exportação completa da raiz do repositório.

## Diagnóstico
- As rotas API em `src/routes/api/ext/` existem no código, mas o usuário reporta 404 no deploy.
- A suíte de testes atual é superficial (`expect(true).toBe(true)`).
- O processo de geração do ZIP não estava incluindo arquivos da raiz (`package.json`, etc).

## Ações Imediatas

### 1. Infraestrutura e Compilação
- Verificar e garantir que `src/integrations/supabase/client.server.ts` usa exclusivamente `process.env`.
- Consolidar a migration em `supabase/migrations/20260820000000_v17_final.sql` para ser idempotente e completa (tabelas + bucket + policies).

### 2. Correção de Rotas API e CORS
- Revisar `getCorsHeaders` em todas as rotas API para garantir que `OPTIONS` e `POST` funcionem no domínio público.
- Garantir que `MR_EXTENSION_ORIGIN` seja respeitado ou tenha fallback seguro para desenvolvimento.

### 3. Fortalecimento da Suíte de Testes
- Atualizar `tests/api-ext/routes.test.ts` para testar a lógica real dos handlers (mockando `supabaseAdmin` e `fetch`).
- Validar fluxos de:
    - Licença ativa/expirada/limite de HWID.
    - Heartbeat (update `last_seen`).
    - Proxy SSE no `send-command` e `fix-stream`.
    - Upload (validação de tamanho/tipo e URL assinada).

### 4. Auditoria e Documentação
- Gerar o relatório final `AUDITORIA_MR_CENTRAL_FINAL.md` com evidências de build e testes.
- Criar um `.env.example` completo.

### 5. Exportação Definitiva
- Criar um script para gerar o ZIP a partir da raiz do repositório, incluindo todos os arquivos de configuração (`package.json`, `tsconfig.json`, `pnpm-lock.yaml`, etc).
- Registrar o novo ZIP como asset e atualizar os links de download.

## Detalhes Técnicos
- As rotas TanStack Start devem ser tratadas como server-only quando usarem `client.server.ts`.
- O bucket `mr-ext-uploads` deve ser criado via migration SQL robusta.
- A lógica de `send-command` deve preservar o payload do motor para o proxy upstream.
