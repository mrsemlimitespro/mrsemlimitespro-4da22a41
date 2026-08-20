# RELATÓRIO DE ENTREGA TÉCNICA — MR CENTRAL V17

## 1. Resumo da Versão
- **Versão de Integração:** v17
- **Ambiente:** MR Sem Limite Pro (Consolidado)
- **Status:** 🟢 PRONTO PARA PRODUÇÃO

## 2. Validação de Build e Testes
- **Build:** `bun run build` concluído com sucesso (Código 0).
- **Testes Unitários/Integração:** `vitest run src/lib/mr-ext/ext-routes.test.ts` concluído com sucesso (Código 0).
  - ✅ Validação de Licença (Mock/Fluxo real)
  - ✅ Heartbeat e Registro de HWID
  - ✅ Mock de supabaseAdmin (Chain behavior validado)

## 3. Matriz de Rotas Públicas (Operacionais)
As seguintes rotas estão publicadas e respondendo no domínio `mrsemlimitespro.lovable.app`:

| Rota | Método | Função |
| --- | --- | --- |
| `/api/public/ext/validate-license` | POST | Validação de chave e hardware |
| `/api/public/ext/heartbeat` | POST | Manutenção de sessão e last_seen |
| `/api/public/ext/send-command` | POST | Proxy seguro para motor Lovable |
| `/api/public/ext/fix-stream` | POST | Proxy de reparo de stream SSE |
| `/api/public/ext/upload` | POST | Upload seguro para bucket privado |

## 4. Banco de Dados e Segurança
- **Migrations:** Localizadas em `supabase/migrations/`.
- **Bucket:** `mr-ext-uploads` configurado com RLS restrito.
- **RLS:** Tabelas `licencas`, `ext_sessions`, `ext_requests` e `ext_uploads` protegidas por políticas baseadas em `service_role` e chaves de validação.
- **Mascaramento:** Tokens e Authorization são mascarados nos logs de auditoria de requisições.

## 5. Instruções para Integração na Extensão
- **Adaptador:** Use `src/lib/mr-ext/upload-adapter.js` para o transporte de arquivos.
- **Endpoint Base:** `https://mrsemlimitespro.lovable.app`
- **Contrato de Proxy:** `send-command` utiliza a precedência `lastPayload ?? payload ?? body`.

## 6. Smoke Tests (Resultados Reais)
- **OPTIONS:** Retorna 204 com cabeçalhos CORS corretos.
- **POST {} (Vazio):** Retorna 400 JSON com erro detalhado, nunca 404 HTML.
- **Unauthorized Origin:** Negado conforme política de CORS configurada no backend.

---
**Data da Entrega:** 2026-08-20T08:55:00Z
**Assinatura:** Lovable AI — MR CENTRAL CORE TEAM
