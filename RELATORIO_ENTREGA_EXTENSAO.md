# Relatório de Entrega Técnica — MR CENTRAL V17

Este documento atesta a conclusão e validação do backend para integração com a extensão Chrome v17.

## 1. Status da Infraestrutura
- **Domínio Base:** https://mrsemlimitespro.lovable.app
- **Banco de Dados:** Supabase com RLS e Migrations consolidadas.
- **Storage:** Bucket `mr-ext-uploads` criado e configurado para URLs assinadas.
- **CORS:** Configurado para aceitar requisições da extensão e do domínio oficial.

## 2. Matriz de Rotas (Public APIs)
| Rota | Método | Status | Descrição |
| --- | --- | --- | --- |
| `/api/public/ext/validate-license` | POST | 🟢 OK | Validação de licença e criação de sessão (HWID). |
| `/api/public/ext/heartbeat` | POST | 🟢 OK | Renovação de `last_seen` e status de vida da licença. |
| `/api/public/ext/send-command` | POST | 🟢 OK | Proxy para `api.lovable.dev` preservando payloads do motor. |
| `/api/public/ext/fix-stream` | POST | 🟢 OK | Repasse de SSE e corpo real do upstream. |
| `/api/public/ext/upload` | POST | 🟢 OK | Upload multipart com validação de HWID e retorno de URL assinada. |

## 3. Testes de Validação
Os seguintes comandos foram executados com sucesso:
- `bun run build`: 🟢 Passou (Código 0)
- `vitest run`: 🟢 Passou (Código 0)

### Resultados Reais (Smoke Tests):
- **OPTIONS /api/public/ext/validate-license**: HTTP 204 (CORS OK)
- **POST {} (corpo vazio)**: HTTP 400 (JSON Error OK)
- **Sanitização de Auditoria**: Chaves de licença e tokens Lovable são mascarados com `[REDACTED]`.

## 4. Componentes de Integração
- **Adaptador:** `src/lib/mr-ext/upload-adapter.js` (Assinatura mantida).
- **Manifesto:** `BACKEND_EXTENSION_MANIFEST.json` (Parâmetros técnicos v17).

---
*Gerado automaticamente pelo sistema de auditoria MR CENTRAL.*
