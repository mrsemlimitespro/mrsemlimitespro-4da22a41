# AUDITORIA TÉCNICA MR CENTRAL — BACKEND V17

## 1. Ambiente Real (Inventário)
- **URL Publicada:** `https://mrsemlimites.lovable.app`
- **GitHub Commit:** \`f6d8cb40f930e4e36e0cef8a0fee7724b44e80e6\` (Wed Aug 19 22:11:11 2026)
- **Status do Build:** 🟢 CONCLUÍDO (pnpm build com sucesso).
- **Status dos Testes:** 🟢 3/3 PASSOU (ext-api.test.ts).

### Supabase e Banco de Dados
- **Tabelas Encontradas:**
  - \`licencas\`: OK (Estrutura V17 confirmada via metadados de requests).
  - \`ext_sessions\`: OK.
  - \`ext_requests\`: OK (Contém registros reais de auditoria sanitizada).
  - \`ext_uploads\`: OK.
- **Migrations Aplicadas:** A última migration \`20260819160432\` está registrada mas o bucket de storage não foi detectado no runtime via API.
- **RLS:** Tabelas protegidas com ENABLE RLS e GRANT service_role.
- **Storage:** Bucket \`mr-ext-uploads\` **NÃO ENCONTRADO** via inspeção de runtime (necessário recriar via migration definitiva).

### Rotas e Arquivos
| Rota | Arquivo Implementador | Status |
| --- | --- | --- |
| \`/api/ext/validate-license\` | \`src/routes/api/ext/validate-license.ts\` | 🟢 Operacional |
| \`/api/ext/heartbeat\` | \`src/routes/api/ext/heartbeat.ts\` | 🟢 Operacional |
| \`/api/ext/send-command\` | \`src/routes/api/ext/send-command.ts\` | 🟢 Proxy SSE Real |
| \`/api/ext/fix-stream\` | \`src/routes/api/ext/fix-stream.ts\` | 🟢 Proxy SSE Real |
| \`/api/ext/upload\` | \`src/routes/api/ext/upload.ts\` | 🟡 Backend pronto, falta bucket |

## 2. Contratos Funcionais (Avaliação)

### Licenças e Sessões
- **Formato:** Suporta \`MR-XXXX-XXXX-XXXX\` via regex \`validateKeyFormat\`.
- **Status:** Implementado \`active\`, \`revoked\`, \`trial\` no Helper Server.
- **Retorno API:** Entrega \`licenca_id\`, \`user_name\`, \`status\`, \`expires_at\`, \`hwid\`, \`session_id\` e \`max_devices\`.
- **HWID:** Bloqueia múltiplos dispositivos corretamente.

### Proxy de Comando (Upstream)
- **Call Upstream:** Faz exatamente 1 chamada para \`https://api.lovable.dev/projects/{projectId}/chat\`.
- **Payload:** Preserva \`lastPayload ?? payload ?? body\`.
- **Segurança:** Não armazena token de usuário; exige \`Authorization: Bearer\` vindo da extensão.

### Stream e Erros
- **SSE:** Repassa o stream bruto do upstream Lovable.
- **Erros:** Retorna o status real do erro upstream (404, 401, etc), sem sucessos fictícios.

### CORS e Segurança
- **CORS:** Restrito ao \`MR_EXTENSION_ORIGIN\` em produção.
- **Sanitização:** Remove campos sensíveis (token, key, password) antes de gravar auditoria em \`ext_requests\`.

## 3. Achados de Auditoria (Pontos Críticos)
1. **Storage Bucket:** O bucket \`mr-ext-uploads\` não foi criado automaticamente ou as permissões de \`service_role\` estão incompletas para listagem.
2. **Migration Incompleta:** Falta a criação programática do bucket nas migrations anteriores.
3. **CORS Preflight:** As rotas respondem \`204\` em \`OPTIONS\`, o que é correto para a extensão.

---

# PLANO DE CORREÇÃO IMEDIATA (ETAPA 3)
1. **Migration V18 Final:** Criar bucket e políticas de storage via SQL.
2. **Limpeza:** Garantir árvore única em \`src/routes/api/ext\` e \`src/lib/mr-ext\`.
3. **ZIP Final:** Gerar pacote consolidado com todos os componentes validados.
