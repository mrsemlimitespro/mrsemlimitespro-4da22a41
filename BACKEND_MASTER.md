# BACKEND_MASTER.md

> **Status:** 🔒 **Backend CONGELADO** para desenvolvimento — 2026-07-14.
> Novas funcionalidades deverão ser implementadas apenas na **MR Extension Factory** até nova autorização.
> Última migration aplicada: `20260714204353` (Fase 1 — schema aditivo multi-extensão).
> Fase 2 aplicada: leitura no-op opcional de `extension_id` nos 5 endpoints públicos.

---

## 1. Arquitetura geral

**Sistema:** MR Sem Limites (MR Lova) — plataforma que licencia a extensão "MR LOV" para revendedores e clientes finais.

**Stack:**
- **Frontend:** TanStack Start v1 (SSR/Edge) + React 19 + Vite 7 + Tailwind v4
- **Backend app-interno:** `createServerFn` do `@tanstack/react-start` (rodando no Worker Edge da Cloudflare)
- **APIs públicas / webhooks / callers externos:** rotas `createFileRoute` em `src/routes/api/public/*`
- **Banco de dados / Auth / Storage / RLS:** Supabase (via Lovable Cloud)
- **E-mails:** EmailService central (`src/lib/email/*`), suporte a Resend, atualmente em modo `disabled` (`EMAIL_ENABLED=false`) → apenas registra logs
- **Extensão cliente:** MR LOV 2.2 (Chrome MV3) via extension-sdk (`extension-sdk/`)

**Camadas:**

```
┌───────────────────────────────────────────────────────┐
│  Extensão Chrome (MR LOV 2.2 + extension-sdk)         │
└──────────────────┬────────────────────────────────────┘
                   │ HTTPS
┌──────────────────┴────────────────────────────────────┐
│  Rotas públicas /api/public/*  (Edge Worker)          │
│    validar-licenca | ext/functions/v1/* | licenca/*   │
│    webhooks/{kiwify,cakto,mercadopago}                │
└──────────────────┬────────────────────────────────────┘
                   │ service_role (server-side)
┌──────────────────┴────────────────────────────────────┐
│  Supabase Postgres                                    │
│    RLS + Policies + RPCs SECURITY DEFINER + Triggers  │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  Painel Web (revendedores + admin)                    │
│    /admin.*  |  /_app.*  |  createServerFn (RLS)      │
└───────────────────────────────────────────────────────┘
```

---

## 2. Fluxo — Validação de licença

**Endpoints:**
- `POST /api/public/validar-licenca` (SDK atual)
- `POST /api/public/ext/functions/v1/validate-license-v2` (compat MR LOV 2.2)

**Passos:**
1. Cliente envia `{ email?, chave, device_id, versao?, extension_id? }` (extension_id: **lido e ignorado** — reserva Fase 3+)
2. `sb.rpc('expirar_trials_vencidos')` — expira trials vencidos lazy
3. `SELECT` em `licencas` por `chave`
4. Se `email` estiver preenchido no banco e no request, precisam bater (case-insensitive)
5. Valida `status = 'ativa'`, `versao_min` (se houver)
6. **Primeira ativação do trial:** se `tipo='teste'` e `trial_iniciado_em IS NULL` → grava `trial_iniciado_em=now()`, calcula `expira_em = now() + trial_duracao_minutos`
7. **Primeira ativação premium:** se `tipo='premium'` e `expira_em IS NULL` → calcula `expira_em = now() + duracao_dias`
8. Se `expira_em < now()` → status='expirada', retorna erro
9. **Controle de dispositivos:** `licenca_dispositivos` (limite via `max_dispositivos`, 0=ilimitado)
10. **Proxy fornecedor:** se `fornecedor_slug='custom_http'` → chama endpoint externo (chave nunca sai)
11. Grava `licenca_acessos` (best-effort)
12. Retorna `{ ok, valid, premium, expira_em, expires_in, cliente_id }`

---

## 3. Fluxo — Geração de licença

**Manual:** RPC `gerar_licencas(_quantidade, _duracao_dias, _revendedor_id)` — admin ou revendedor.
Gera chave via `gerar_chave_licenca()` (formato `XXXXX-XXXXX-XXXXX-XXXXX`, alfabeto sem ambíguos).

**Automática por pagamento:** trigger `tg_pagamento_gerar_licenca` em `payment_transactions`:
- Só dispara quando `status='aprovado'` e `plano_id IS NOT NULL`
- Idempotente via `metadata->>'payment_id'`
- Cria/localiza cliente por email, gera licença premium vinculada ao produto do plano
- Enfileira email `licenca_criada` (via trigger `tg_licenca_email`)
- Notifica revendedor + cliente (se tiver `auth.users`)

---

## 4. Fluxo — Heartbeat

**Endpoint:** `POST /api/public/licenca/heartbeat`

Body: `{ chave, device_id?, extension_id? }` (extension_id lido e ignorado)

Chama RPC `heartbeat_licenca(_chave, _device_id)`:
- `SELECT ... FOR UPDATE`
- Expiração lazy (se `expira_em < now()` e status='ativa' → 'expirada')
- Verifica device_id vs `licencas.device_id` → retorna `DEVICE_MISMATCH`
- Atualiza `ultimo_acesso = now()`
- Retorna `{ ok, estado, expira_em }` — estado vem de `v_licenca_estado`

---

## 5. Fluxo — Ativação

Não há endpoint de ativação separado. A ativação acontece implicitamente no **primeiro `validar-licenca`** (ver §2, passos 6–7): a primeira chamada bem-sucedida grava `ativada_em` e inicia o cronômetro (trial ou premium).

Extensão trata a licença como "ativada" no primeiro `status='valid'` recebido.

---

## 6. Fluxo — Atualização (versão da extensão)

**Endpoint de configuração:** `POST /api/public/licenca/config` retorna versão mínima + config remota.
**Verificação de versão mínima:** `validar-licenca` compara `versao` (enviada pelo cliente) com `licencas.versao_min`. Se abaixo → retorna `"Versão desatualizada. Atualize a extensão."`.
**Download da extensão:** `GET /api/public/download-extensao` serve o ZIP mais recente do bucket `extensao`.

---

## 7. Fluxo — Webhooks

**Endpoints:**
- `POST /api/public/webhooks/kiwify`
- `POST /api/public/webhooks/cakto`
- `POST /api/public/webhooks/mercadopago`

Cada handler:
1. Verifica assinatura HMAC do gateway
2. Registra em `payment_webhook_logs` (raw body, headers, status)
3. Cria/atualiza `payment_transactions`
4. Ao mudar para `status='aprovado'`, os triggers disparam:
   - `tg_pagamento_status` → `approve_pagamento` (libera créditos e ativa plano)
   - `tg_pagamento_gerar_licenca` → cria licença
   - `tg_pagamento_email_compra` → enfileira `compra_aprovada`
   - `tg_pagamento_provisionar_painel` → `provisionar_revendedor_por_pagamento` (se o plano casar com `painel_revendedor_plano_id`)
   - `tg_pagamento_notify` → notifica revendedor

---

## 8. Fluxo — Clientes

- `clientes` é criado por: signup (`tg_auth_user_to_cliente` em `auth.users`), pagamento aprovado (auto), painel admin/revendedor
- **Consumo de créditos:** trigger `tg_cliente_consume_credit` em INSERT — desconta 1 crédito do revendedor
- **Vínculo à licença:** RPC `atribuir_licenca_cliente(_chave, _cliente_id, _email)` — anti-abuso: 1 trial por email (bypass admin)

---

## 9. Fluxo — Revendedores

- **Cadastro manual:** admin (`admin/revendedores-gestao`) via `src/lib/revendedores/admin.functions.ts`
- **Cadastro automático:** trigger `tg_pagamento_provisionar_painel` → `provisionar_revendedor_por_pagamento` cria revendedor + role + envia email `painel_revendedor_acesso`
- **Auto-cadastro:** RPC `create_revendedor_profile` para usuários autenticados
- **Créditos:** RPC `add_credits` centraliza soma/dedução, escreve em `creditos_movimentos`
- **Roles:** tabela `user_roles` + função `has_role` (SECURITY DEFINER, sem recursão RLS)

---

## 10. Fluxo — Pagamentos

- Tabela raiz: `payment_transactions`
- Configuração de gateways: `payment_gateways`, `payment_methods_config`
- Logs brutos: `payment_webhook_logs`
- Aprovação centralizada em `approve_pagamento` (RPC + trigger `tg_pagamento_status`)
- Idempotência: verificação em `licencas.metadata->>'payment_id'` e `payment_transactions.creditos_liberados`

---

## 11. Fluxo — Produtos

- Tabela `produtos` (16 col + `slug` novo da Fase 1)
- Ligação com licenças via `licencas.produto_id` (nullable — retrocompat)
- Ligação com planos via `planos.produto_id`
- Extensões: `extensao_configs.produto_id` (Fase 1, nullable)
- Templates de e-mail: `email_templates.produto_id` (Fase 1, nullable)
- Configuração remota por extensão: `admin_settings.config_extensao_por_produto` (jsonb, Fase 1)

---

## 12. Fluxo — Download da extensão

`GET /api/public/download-extensao?slug=…`
1. Busca metadados em `admin_settings.config_extensao` (link, versão)
2. Storage bucket privado `extensao` → gera signed URL
3. Retorna 302 para o signed URL (validade curta)

---

## 13. Fluxo — Configuração remota

`POST /api/public/licenca/config` retorna:
- `versao_min`
- Config global de `admin_settings.config_extensao`
- (Reservado Fase 3+): config específica de `admin_settings.config_extensao_por_produto->>extension_id`

---

## Inventário

### Tabelas (49 públicas)

`access_logs`, `admin_settings`, `ai_agents`, `ai_prompts`, `api_keys`, `audit_logs`, `aulas`, `banners`, `carrossel_slides`, `clientes`, `creditos_movimentos`, `creditos_packs`, `device_push_tokens`, `dispositivos`, `email_logs`, `email_queue`, `email_templates`, `estoque`, `extensao_configs`, `imagens`, `licenca_acessos`, `licenca_dispositivos`, `licenca_produtos`, `licencas`, `licencas_eventos`, `logos`, `mensagens_campanhas`, `notificacoes`, `pack_access`, `pack_authorizations`, `pack_download_logs`, `payment_gateways`, `payment_methods_config`, `payment_transactions`, `payment_webhook_logs`, `planos`, `premium_packs`, `produtos`, `promocoes`, `prompt_classification_learning`, `prompt_favorites`, `prompt_history`, `propagandas`, `push_preferences`, `revendedores`, `sales_events`, `system_modules`, `user_roles`, `videos`.

### RPCs / Funções SQL (44)

**Licenças:** `validar_licenca`, `heartbeat_licenca`, `consulta_licenca_publica`, `gerar_chave_licenca`, `gerar_licencas`, `renovar_licenca`, `cancelar_licenca`, `reativar_licenca`, `resetar_device_licenca`, `converter_licenca_em_premium`, `atribuir_licenca_cliente`, `reenviar_licenca`, `expirar_licencas_vencidas`, `expirar_trials_vencidos`, `notificar_licencas_expirando`.

**Pagamentos:** `approve_pagamento`, `provisionar_revendedor_por_pagamento`.

**Revendedores/Clientes/Auth:** `create_revendedor_profile`, `current_revendedor_id`, `is_revendedor`, `has_role`, `ensure_admin_role`, `revendedor_dashboard`, `add_credits`.

**Admin:** `admin_password_configured`, `set_admin_password`, `verify_admin_password`, `limpar_logs_antigos`, `criar_notificacao`, `log_audit`.

**E-mail:** `enfileirar_email`.

**Packs:** `authorize_pack_download`, `pack_client_has_access`.

**Triggers:** `tg_auth_user_to_cliente`, `tg_cliente_consume_credit`, `tg_licenca_email`, `tg_licenca_tipo_transicao`, `tg_licencas_evento`, `tg_pagamento_email_compra`, `tg_pagamento_gerar_licenca`, `tg_pagamento_notify`, `tg_pagamento_provisionar_painel`, `tg_pagamento_status`, `tg_set_updated_at`.

### Endpoints públicos (`/api/public/*`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/public/validar-licenca` | Valida licença SDK |
| POST | `/api/public/ext/functions/v1/validate-license-v2` | Compat MR LOV 2.2 |
| POST | `/api/public/ext/functions/v1/inject-config` | Config + licença (compat MR LOV 2.2) |
| GET  | `/api/public/ext/functions/v1/get-templates` | Templates da extensão |
| GET  | `/api/public/ext/functions/v1/get-support-info` | Info de suporte |
| GET  | `/api/public/ext/functions/v1/serve-extension-ui` | UI da extensão |
| GET  | `/api/public/ext/functions/v1/lov4` | Endpoint interno LOV4 |
| GET  | `/api/public/ext/storage/v1/object/$` | Proxy storage |
| GET  | `/api/public/licenca/consulta` | Consulta pública de estado |
| POST | `/api/public/licenca/heartbeat` | Heartbeat |
| POST | `/api/public/licenca/renovar` | Renovação |
| POST | `/api/public/licenca/revogar` | Revogação |
| POST | `/api/public/licenca/reset-hwid` | Reset HWID |
| GET  | `/api/public/licenca/config` | Config remota |
| GET  | `/api/public/download-extensao` | Download da extensão |
| GET  | `/api/public/premium-cover/$` | Capa premium |
| POST | `/api/public/webhooks/kiwify` | Webhook Kiwify |
| POST | `/api/public/webhooks/cakto` | Webhook Cakto |
| POST | `/api/public/webhooks/mercadopago` | Webhook MercadoPago |
| POST | `/api/public/hooks/email-worker` | Worker de envio de e-mails |

### Buckets Storage

- `admin-media` (privado)
- `premium-covers` (privado, servido via proxy)
- `user-uploads` (privado)
- `lovable-message-attachments` (privado)
- `extensao` (privado, servido via signed URL)

### Edge Functions

**Nenhuma.** Todas as funções server-side rodam via TanStack `createServerFn` ou rotas `api/public/*` no Worker Edge.

### Rotas administrativas (painel)

`/admin`, `/admin/home`, `/admin/index`, `/admin/clientes`, `/admin/clientes/:id`, `/admin/licencas`, `/admin/licencas-dashboard`, `/admin/pagamentos`, `/admin/revendedores-gestao`, `/admin/loja`, `/admin/loja-produtos`, `/admin/pack-autorizacoes`, `/admin/configuracoes`, `/admin/personalizacao`, `/admin/comunicacao`, `/admin/modulos`, `/admin/sons`, `/admin/animacoes`, `/admin/visualizacao`, `/admin/usuarios`, `/admin/seguranca`, `/admin/backup`, `/admin/ajustar-creditos`, `/admin/$resource`.

### Rotas do app (revendedor/cliente)

`/_app` (layout), `/_app/index`, `/_app/dashboard`, `/_app/clientes`, `/_app/licencas`, `/_app/creditos`, `/_app/revendedor`, `/_app/quero-ser-revendedor`, `/_app/packs`, `/_app/packs/:slug`, `/_app/prompts`, `/_app/agents`, `/_app/aulas`, `/_app/minha-conta`, `/_app/perfil`, `/_app/redefinir-senha`, `/_app/baixar-extensao`.

**Auth:** `/login`, `/registro`, `/esqueci-senha`, `/reset-password`, `/checkout`.

---

## Integrações externas

- **Kiwify, Cakto, MercadoPago:** webhooks de pagamento (HMAC verificado)
- **Resend:** provider de e-mail (arquitetura pronta, `EMAIL_ENABLED=false` atualmente)
- **Lovable AI Gateway:** IA (LOVABLE_API_KEY)
- **Fornecedor upstream `custom_http`:** proxy fail-closed para validação de chave externa

---

## Dependências críticas

| Componente | Depende de |
|---|---|
| Extensão MR LOV | `/api/public/ext/functions/v1/*` e `/api/public/validar-licenca` |
| Painel admin | RLS + `has_role('admin')` |
| Painel revendedor | RLS + `current_revendedor_id()` |
| Pagamento → Licença | 5 triggers em cadeia (`tg_pagamento_*`) |
| E-mail transacional | `enfileirar_email` + `email_queue` + worker |

---

## Pontos críticos (não tocar sem análise)

1. **`validar_licenca` RPC + endpoint `/api/public/validar-licenca`** — coração da monetização; mudanças exigem retrocompat total
2. **Cadeia de 5 triggers em `payment_transactions`** — ordem importa (status → aprovar → licença → email → provisionar → notificar)
3. **`has_role` SECURITY DEFINER** — sem ele, RLS causa recursão infinita
4. **`gerar_chave_licenca`** — alfabeto sem caracteres ambíguos; NÃO alterar formato (extensão parseia)
5. **HMAC dos webhooks** — assinatura verificada antes de qualquer processamento
6. **`v_licenca_estado`** — view usada por `consulta_licenca_publica` e `heartbeat_licenca`

---

## Plano de backup

- **Migrations (55 arquivos):** já espelhadas em `.lovable/backups/20260714/migrations/`
- **Funções SQL:** `.lovable/backups/20260714/sql/functions-full.sql` (1.588 linhas)
- **Lista de funções:** `.lovable/backups/20260714/sql/functions-list.txt`
- **Dados:** exportáveis via painel Lovable Cloud → Advanced settings → Export data
- **Storage:** buckets acessíveis via Supabase Studio (via Lovable)

---

## Plano de rollback

### Fase 1 (schema aditivo multi-extensão)
```sql
DROP INDEX IF EXISTS public.licencas_produto_id_chave_idx;
ALTER TABLE public.extensao_configs DROP COLUMN IF EXISTS produto_id;
DROP INDEX IF EXISTS public.extensao_configs_produto_id_idx;
ALTER TABLE public.email_templates DROP COLUMN IF EXISTS produto_id;
DROP INDEX IF EXISTS public.email_templates_produto_id_idx;
ALTER TABLE public.admin_settings DROP COLUMN IF EXISTS config_extensao_por_produto;
DROP INDEX IF EXISTS public.produtos_slug_unique_idx;
ALTER TABLE public.produtos DROP COLUMN IF EXISTS slug;
```

### Fase 2 (leitura no-op de extension_id)
Reverter os 5 arquivos editados (3 linhas cada):
- `src/routes/api/public/validar-licenca.ts`
- `src/routes/api/public/ext/functions.v1.validate-license-v2.ts`
- `src/routes/api/public/ext/functions.v1.inject-config.ts`
- `src/routes/api/public/licenca/heartbeat.ts`
- `src/routes/api/public/licenca/consulta.ts`

Nenhum rollback destrutivo. Rollback global: usar Lovable → History para restaurar mensagem anterior.

---

## Pontos preparados para múltiplas extensões

Tudo abaixo está **presente mas inerte** — não altera o comportamento atual:

| Preparação | Onde | Uso futuro |
|---|---|---|
| `produtos.slug` (Fase 1) | Coluna nullable + índice único parcial | Lookup por slug via `extension_id` |
| `admin_settings.config_extensao_por_produto` (Fase 1) | jsonb default `{}` | Config por produto: `->>extension_id` |
| `email_templates.produto_id` (Fase 1) | FK opcional | Templates específicos por extensão |
| `extensao_configs.produto_id` (Fase 1) | FK opcional | Config completa por extensão |
| Índice `licencas(produto_id, chave)` (Fase 1) | — | Acelerar validação filtrada por produto |
| `extension_id` opcional nos endpoints (Fase 2) | 5 endpoints | Roteamento futuro por extensão |

**Nada disso está sendo lido/gravado hoje.** Ativação exige Fase 3+ (não iniciada, pendente de aprovação).

---

## Autores das mudanças recentes

- Fase 1 (2026-07-14): schema aditivo — migration `20260714204353`
- Fase 2 (2026-07-14): leitura no-op `extension_id` — 5 arquivos, 15 linhas
- Fase 3 (2026-07-14): **este documento**. Zero código, zero migration.

---

## 🔒 Encerramento

**O backend está congelado para desenvolvimento.**

**Novas funcionalidades deverão ser implementadas apenas na MR Extension Factory até nova autorização.**
