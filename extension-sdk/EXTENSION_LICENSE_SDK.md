# EXTENSION_LICENSE_SDK — Documentação Completa

> Documentação do sistema de licenças da extensão **MR Sem Limites 2.2.7**,
> extraída sem alterar código em produção. Serve como especificação para
> reutilizar o mesmo sistema em outras extensões.

---

## 1. Arquitetura completa

```
┌────────────────────────────────────────────────────────────────────┐
│                        FORNECEDOR (Cakto / Kiwify / MP)            │
│                        emite venda → webhook                       │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                      PAINEL (mrsemlimites.lovable.app)             │
│  Rotas: /admin/licencas, /admin/pagamentos, /baixar-extensao       │
│  Servidor TanStack Start + Server Functions                        │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                    BANCO (Lovable Cloud / Postgres)                │
│  Tabelas: licencas, licenca_dispositivos, licenca_acessos,         │
│           licenca_produtos, licencas_eventos, admin_settings       │
│  RPCs:   expirar_trials_vencidos, consulta_licenca_publica         │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API PÚBLICA (/api/public/ext/*)             │
│  POST /functions/v1/inject-config       ← usada pelo SDK           │
│  POST /functions/v1/validate-license-v2 ← usada pelo sidepanel     │
│  GET  /licenca/consulta, /licenca/config, /licenca/heartbeat       │
│  POST /licenca/renovar, /licenca/revogar, /licenca/reset-hwid      │
│  POST /validar-licenca (legacy)                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                            EXTENSÃO CHROME                         │
│  background.js (service worker)                                    │
│    └─ importa lib/license.js → SDK                                 │
│  content/content.js, sidepanel.js, popup.js                        │
│    └─ leem `licenseState` de chrome.storage.local via lib/storage  │
└────────────────────────────────────────────────────────────────────┘
```

### 1.1 Fluxo resumido

```
Fornecedor → Painel → Banco → API → Extensão
                                   ↓
                              Validação
                                   ↓
                              Liberação
                                   ↓
                              Expiração
                                   ↓
                              Renovação
```

---

## 2. Fluxo detalhado da licença

1. **Emissão**: fornecedor envia webhook (`/api/public/webhooks/{cakto|kiwify|mercadopago}`).
2. **Persistência**: painel grava linha em `public.licencas` com `chave`,
   `tipo` (`teste` | `premium`), `duracao_dias`, `trial_duracao_minutos`,
   `max_dispositivos`, `status='ativa'`.
3. **Entrega**: cliente recebe a chave (`MR-XXXX-XXXX-XXXX`).
4. **Ativação no cliente**: usuário cola a chave no sidepanel/popup da extensão.
5. **Validação online** (`POST /functions/v1/inject-config`):
   - HWID gerado localmente (crypto.randomUUID armazenado em `settings.deviceId`).
   - Servidor confere status, expiração, limite de dispositivos, fornecedor.
   - Se `tipo=teste` e ainda não iniciou, cronômetro começa aqui
     (`trial_iniciado_em = now`, `expira_em = now + trial_duracao_minutos`).
   - Se `tipo=premium` e ainda não iniciou, `expira_em = now + duracao_dias`.
6. **Liberação**: resposta contém `config` (feature flags), `plan`, `expires_at`.
   O SDK grava `licenseState.status='valid'` e a extensão libera features.
7. **Cache**: TTL de 60 s (`LICENSE_CACHE_TTL_MS`). Consultas repetidas neste
   intervalo usam o cache local — reduz carga sem sacrificar segurança.
8. **Expiração**: quando `expira_em < now`, servidor devolve `expired`;
   o SDK persiste `status='expired'` e as features ficam bloqueadas.
9. **Renovação**: novo pagamento gera nova chave OU o painel estende
   `expira_em` via `/api/public/licenca/renovar`.
10. **Bloqueio manual**: painel muda `status` para `cancelada`/`revogada`
    → próxima validação retorna `revoked` → SDK bloqueia.

---

## 3. Estrutura de arquivos do SDK

```
extension-sdk/src/
├── index.ts        ← createLicenseSDK() — fachada pública
├── types.ts        ← LicenseState, LicenseConfig, LicenseStatus…
├── constants.ts    ← default URLs, TTL, storage key
├── storage.ts      ← getSettings / setSettings / resetSettings
└── license.ts      ← validateLicense, getLicenseState, mapErrorToStatus
```

Réplica direta de `lib/constants.js`, `lib/license.js` e `lib/storage.js` da
extensão, tipada e parametrizada por `LicenseConfig`.

---

## 4. Dependências

- **Runtime**: nenhuma (usa apenas APIs nativas do Chrome MV3: `fetch`,
  `chrome.storage.local`, `crypto.subtle`).
- **Build (opcional)**: TypeScript 5+, esbuild ou Vite para transpilar.
- **Manifest**: `"permissions": ["storage"]` e `"host_permissions"` para o
  domínio da API (default `https://mrsemlimites.lovable.app/*`).

---

## 5. Variáveis obrigatórias (`LicenseConfig`)

| Campo | Tipo | Exemplo |
|---|---|---|
| `extensionName` | string | `"MR Sem Limites 2.2"` |
| `extensionId` | string | `"mr-sem-limites"` |
| `version` | string | `"2.2.7"` |
| `apiBaseUrl` | string | `"https://mrsemlimites.lovable.app/api/public/ext"` |
| `panelUrl` | string | `"https://mrsemlimites.lovable.app"` |
| `anonKey` | string | `"mrlov"` |
| `timeoutMs` | number | `15000` |
| `cacheTtlMs` | number | `60000` |
| `trialMinutes` | number | `30` |
| `paidDays` | number | `30` |
| `productName` | string | `"MR Sem Limites"` |
| `logoUrl` | string | `"/logo.png"` |
| `endpoints.injectConfig` | string | `"/functions/v1/inject-config"` |
| `endpoints.validateV2` | string | `"/functions/v1/validate-license-v2"` |
| `endpoints.heartbeat` | string | `"/licenca/heartbeat"` |
| `endpoints.renovar` | string | `"/licenca/renovar"` |
| `endpoints.revogar` | string | `"/licenca/revogar"` |
| `endpoints.resetHwid` | string | `"/licenca/reset-hwid"` |

---

## 6. Endpoints utilizados

Todos sob `apiBaseUrl` (default: `https://mrsemlimites.lovable.app/api/public/ext`
e `/api/public` para heartbeat/renovar/revogar/reset-hwid).

| Método | Rota | Uso |
|---|---|---|
| POST | `/functions/v1/inject-config` | validação principal usada pelo SDK |
| POST | `/functions/v1/validate-license-v2` | validação alternativa (sidepanel) |
| GET  | `/licenca/consulta?chave=...` | consulta pública somente-leitura |
| GET  | `/licenca/config` | pega config remota (feature flags, versão min) |
| POST | `/licenca/heartbeat` | ping periódico |
| POST | `/licenca/renovar` | estende `expira_em` |
| POST | `/licenca/revogar` | desativa licença |
| POST | `/licenca/reset-hwid` | permite trocar dispositivo |

---

## 7. Payloads

### 7.1 `POST /functions/v1/inject-config`
```json
{ "key": "MR-XXXX-XXXX", "email": "cliente@exemplo.com" }
```
Headers: `Content-Type: application/json`, `apikey: <anonKey>`,
`Authorization: Bearer <anonKey>`.

### 7.2 `POST /functions/v1/validate-license-v2`
```json
{ "license_key": "MR-XXXX", "hwid": "uuid", "device_info": { "userAgent": "…" } }
```

### 7.3 `POST /api/public/validar-licenca` (legacy)
```json
{ "email": "…", "chave": "MR-…", "device_id": "…", "device_nome": "…", "versao": "2.2.7" }
```

---

## 8. Respostas

### 8.1 Sucesso (inject-config)
```json
{
  "config": { "featureFlags": { "…": true }, "aviso": null },
  "license": { "plan": "premium", "expires_at": "2026-08-01T00:00:00Z", "bound_email": "..." }
}
```

### 8.2 Sucesso (validate-license-v2)
```json
{
  "status": "valid",
  "session_token": "…",
  "days_remaining": 29,
  "hours_remaining": 720,
  "license_id": "uuid",
  "plan": "premium",
  "expires_at": "2026-08-01T00:00:00Z"
}
```

### 8.3 Erro
```json
{ "status": "expired" | "invalid" | "device_mismatch" | "error", "message": "…" }
```

---

## 9. Tratamento de erros (`mapErrorToStatus`)

| Sinal recebido | Status persistido |
|---|---|
| `reason=revoked` | `revoked` |
| `reason=expired` OU msg contém "expirad"/"expired" | `expired` |
| `reason=device_mismatch`/`post_reset_guard` OU msg com "dispositivo"/"hwid"/"resetar" | `device_mismatch` |
| `reason=transient`, HTTP 5xx, HTTP 429 | `transient` (mantém cache válido) |
| `reason=invalid_key`, HTTP 401/403 | `invalid` |
| Falha de rede / fetch reject | `transient` (offline preserva último estado válido) |
| Qualquer outra falha | `transient` |

---

## 10. Fluxo de autenticação (sessão)

1. Extensão obtém `hwid` estável (persistido em `settings.deviceId`).
2. Envia `key` + `email` (opcional) para `inject-config`.
3. Servidor amarra HWID à licença na primeira ativação
   (`licenca_dispositivos`), respeitando `max_dispositivos`.
4. SDK guarda `licenseState` em `chrome.storage.local` — usado como sessão local.
5. Revalidação automática após `cacheTtlMs` (60s por padrão).

---

## 11. Fluxo de ativação

```
[UI] usuário cola chave  →  sdk.activate(key, email)
      ↓
[SDK] setSettings({ licenseKey: key, userEmail: email })
      ↓
[SDK] validateLicense(key, email, hwid) → POST inject-config
      ↓
[API] confere, inicia cronômetro se primeira ativação
      ↓
[SDK] persiste licenseState { status: 'valid', plan, expiresAt, config }
      ↓
[UI] libera features
```

---

## 12. Fluxo da chave TESTE

- `tipo='teste'`, `trial_iniciado_em=null`, `expira_em=null` no banco.
- Primeira validação:
  - `trial_iniciado_em = now`
  - `expira_em = now + trial_duracao_minutos` (default 30 min).
- SDK devolve `status='valid'`, `plan='trial'`.
- Ao expirar: `status='expired'` → features bloqueadas.
- Não é renovável (nova chave = nova licença).

## 13. Fluxo da chave DEFINITIVA (premium)

- `tipo='premium'`, `duracao_dias` (default 30).
- Primeira validação: `expira_em = now + duracao_dias`.
- Renovável via painel (`/api/public/licenca/renovar` estende `expira_em`).
- Bloqueio manual muda `status` para `cancelada` ou `revogada`.

## 14. Fluxo de bloqueio

- Admin altera `status` no painel.
- Próxima validação (máx. `cacheTtlMs` depois) retorna `revoked`/`expired`.
- SDK persiste, features são bloqueadas imediatamente.

## 15. Fluxo de renovação

- Novo pagamento → webhook atualiza `expira_em` OU cria nova chave.
- Extensão continua com a mesma chave — próxima validação já vê o novo prazo.

## 16. Fluxo de atualização (nova versão da extensão)

- `admin_settings.config_extensao.versao_minima` guarda a versão mínima.
- `GET /api/public/licenca/config` devolve o valor.
- Se `versao_atual < versao_minima` → SDK devolve `status='outdated'`
  (UI mostra aviso "Atualize a extensão").

---

## Estado interno (`LicenseState`)

```ts
{
  status: 'unknown' | 'valid' | 'invalid' | 'expired' | 'revoked'
        | 'device_mismatch' | 'transient' | 'outdated',
  plan: 'trial' | 'premium' | null,
  expiresAt: string | null,     // ISO
  boundEmail: string | null,
  config: Record<string, unknown> | null,
  licenseHash: string | null,   // SHA-256(chave), 16 chars — telemetria segura
  lastChecked: number,          // epoch ms
  error: string | null,
}
```
