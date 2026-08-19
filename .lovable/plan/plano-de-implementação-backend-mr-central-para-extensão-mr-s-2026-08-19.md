# Plano de Implementação Backend MR Central para Extensão MR Sem Limites

Este plano descreve a implementação técnica do backend para suportar a extensão Chrome, focando em segurança, licenciamento e proxy de comandos.

## 1. Banco de Dados (Supabase Migration)
Criar uma nova migration (`supabase/migrations/20260819000000_ext_backend.sql`) com as seguintes tabelas e regras:
- **Tabela `licencas`**: Atualização ou criação de campos conforme especificado.
    - Campos: `license_key` (único, formato `MR-XXXX-XXXX-XXXX`), `user_name`, `email`, `status` (`active`, `revoked`, `trial`), `expires_at`, `max_devices`, `revoked_at`.
    - RLS restrito.
- **Tabela `ext_sessions`**: Controle de dispositivos e sessões.
    - Campos: `license_id`, `hwid`, `session_id`, `last_seen`, `ip`, `user_agent`.
    - Unicidade por `license_id` e `hwid`.
- **Tabela `ext_requests`**: Log de auditoria sanitizado (sem tokens/segredos).
- **Tabela `ext_uploads`**: Metadados de arquivos enviados via extensão.
- **Storage**: Criar bucket `mr-ext-uploads` com RLS privado.

## 2. API Routes (`/api/ext/*`)
Implementar endpoints públicos sob o prefixo `/api/ext/` usando TanStack Start Server Routes:
- `POST /api/ext/validate-license`: Valida chave e vincula HWID respeitando `max_devices`.
- `POST /api/ext/heartbeat`: Atualiza `last_seen` e retorna status da licença.
- `POST /api/ext/send-command`: Proxy controlado para o upstream do Lovable.
    - Validação prévia de licença/HWID.
    - Preservação integral do payload (`lastPayload`).
    - Repasse de streams (SSE) sem acumulação.
    - Auditoria sanitizada.
- `POST /api/ext/fix-stream`: Encaminhamento de contexto para recuperação de stream.
- `POST /api/ext/upload`: Recebimento de arquivos (multipart), validação e salvamento no Storage.

## 3. Adaptador de Upload
Criar o arquivo `src/lib/ext-v17/upload-adapter.js` exportando o `UploadManager.uploadFile` conforme a assinatura exigida, utilizando `XMLHttpRequest` para progresso.

## 4. Segurança e Infraestrutura
- Configurar CORS restrito via variável de ambiente `ALLOWED_EXTENSION_ORIGIN`.
- Helper centralizado para chamadas upstream com proteção de segredos.
- Scripts de teste automatizado para validação de fluxos críticos.

## Detalhes Técnicos
- O backend utilizará `supabaseAdmin` internamente para bypassar RLS do cliente onde necessário, mantendo a lógica de segurança no servidor.
- Respostas HTTP seguirão códigos padronizados (200, 400, 401, 403, 404, 429, 500).
- Nenhuma alteração será feita no frontend ou painéis existentes.
