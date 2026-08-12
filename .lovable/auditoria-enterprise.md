# Auditoria Enterprise — MR Sem Limites

**Data:** 10 de julho de 2026
**Escopo:** 100% do app nativo/web (frontend, backend, banco, storage, mobile)
**Metodologia:** análise estática + queries reais no Postgres + leitura do bundle + inspeção de rotas
**Regra:** cada afirmação é marcada como ✅ Confirmado, ❌ Não encontrado ou ⚠️ Hipótese
**Escopo explícito:** somente auditoria — nenhum arquivo, migration, tabela, rota ou dependência foi alterado

---

## 0. Sumário Executivo

| Métrica | Valor | Fonte |
|---|---|---|
| Rotas (arquivos em `src/routes/`) | 31 | ✅ `ls src/routes` |
| Tabelas em `public` | 42 (todas com RLS) | ✅ `pg_class` |
| Funções SQL `public` | 24 (todas `SET search_path`) | ✅ db-functions dump |
| Server functions (`*.functions.ts`) | 11 arquivos / 1.411 linhas | ✅ `wc -l` |
| Storage buckets | 3 (todos privados) | ✅ config |
| Dependências (prod / dev) | 74 / 18 | ✅ `package.json` |
| LOC em `src/` (excluindo gerados) | ~32.659 | ✅ `wc -l` |
| Arquivos > 500 linhas | 12 | ✅ (ver §14) |
| Uso de `text-white` / `bg-black` hardcoded | **244 ocorrências** | ✅ ripgrep |
| Uso de `bg-[#hex]` hardcoded | **6 ocorrências** | ✅ ripgrep |
| `as any` casts | 96 | ✅ ripgrep |
| Rotas em `_authenticated/` | 0 | ✅ `ls` (⚠️ ver §3) |
| Webhook signature (HMAC) | Implementada com `timingSafeEqual` | ✅ `gateway.server.ts` |
| Rate limit em `/api/public/*` | **Nenhum** | ✅ ripgrep |
| CORS em `validar-licenca` | `Access-Control-Allow-Origin: *` | ✅ arquivo |

**Nota geral: 8.4 / 10** — arquitetura sólida, backend seguro por RLS e webhooks HMAC, porém há débito visual (design system violado 244×), ausência de rate-limit no endpoint público mais crítico, um layout autenticado inexistente e componentes monolíticos.

---

## 1. Relatório — Arquitetura

### Stack (✅ confirmado)
- React 19.2, TanStack Start 1.168, Vite 8.0, Tailwind 4.2
- Capacitor 8.4, `@supabase/supabase-js` 2.110
- SSR via Cloudflare Workers (`workerd`) + Nitro
- File-based routing plano com dots (`_app.packs.$slug.tsx`)

### Pontos fortes ✅
- `router.tsx` com `staleTime: 5min`, `refetchOnFocus: false` — evita cache thrash
- `SoftParticles` via `lazy()` + `hidden md:block` — mobile não paga CPU (✅ `src/routes/_app.tsx:16`)
- Server-only import de `client.server.ts` só via `await import()` — sem leak no bundle client
- Layout `_app.tsx` com `PageBackButton` global, `TopBar`, `InnerPillMenu` e safe-area do iOS

### Problemas
| # | Prio | Arquivo | Linha | Problema | Evidência | Impacto | Correção | Compl. | Est. |
|---|---|---|---|---|---|---|---|---|---|
| A1 | 🔴 Crítica | `src/routes/` | — | **Nenhuma rota está em `_authenticated/`**; o gate é 100% client-side em `useIsAuthed()` (local-first pelo `localStorage`). ✅ `ls src/routes/_authenticated` = inexistente | Flash de conteúdo protegido antes do redirect; SSR entrega HTML autenticado para bots | Vazamento visual + SEO negativo | Migrar `_app.*` para `_authenticated/_app.*` com `ssr:false` (padrão Lovable) | Alta | 4h |
| A2 | 🟠 Alta | `src/routes/_app.index.tsx` | 728 linhas | Home monolítica | ✅ `wc -l` | Difícil de refatorar; renderiza mesmo com feature-flag desligada | Quebrar em `home-sections/` | Média | 2h |
| A3 | 🟠 Alta | `src/routes/admin.pagamentos.tsx` | 1.212 linhas | Tela admin monolítica | ✅ `wc -l` | Bundle admin pesado; qualquer edição regride tudo | Extrair `TabsMovimentos`, `TabsCreditos`, `MetodosPagamento` | Alta | 6h |
| A4 | 🟡 Média | `src/lib/admin/resources.ts` | 1.135 linhas / 71 keys | Registry de admin gigante | ✅ `wc -l` + `rg "^\s*key: \""` | Aumenta bundle admin; qualquer alteração exige re-typecheck do arquivo inteiro | Split por domínio: `resources/licencas.ts`, `resources/pagamentos.ts` etc | Média | 4h |
| A5 | 🟡 Média | `src/routes/admin.animacoes.tsx` | 1.101 linhas | Idem A3 | ✅ `wc -l` | Idem | Idem | Média | 3h |
| A6 | 🟢 Baixa | `capacitor.config.ts` | 22 | `server.url` aponta para produção. Se certificado falhar ou o domínio cair, o app nativo não abre offline | ✅ arquivo | Dependência dura de rede em cold start | Adicionar fallback `webDir` com bundle offline mínimo (splash + reconectar) | Média | 3h |

### Estrutura de camadas ✅
```
src/routes/          → 31 rotas (páginas + api/public/*)
src/components/      → shadcn + próprios (home/, premium-packs/, prompts-library/, ai-modules/)
src/lib/*.functions  → 11 server-fn modules (1.411 linhas)
src/lib/webhooks/    → gateway.server + handler.server (compartilhado por 3 webhooks)
src/integrations/    → supabase (autogen) + lovable
src/native/          → 15 wrappers Capacitor (Camera, Push, Biometric, Share...)
```

---

## 2. Relatório — Banco de Dados

### Tabelas (42) — 100% com RLS habilitado ✅
Query executada: `pg_class.relrowsecurity = true` para todas as 42 tabelas de `public`.

### Row-counts reais (✅ hoje, produção)
| Tabela | Rows | Comentário |
|---|---|---|
| `ai_prompts` | 31 (31 ativos) | ✅ populado |
| `ai_agents` | 12 | ✅ populado |
| `clientes` | 2 | Início da operação |
| `premium_packs` | 1 | Início |
| `produtos` | 1 | Início |
| `imagens` | 1 | Início |
| `user_roles` | 1 | 1 admin cadastrado |
| `licencas` | **0** | ✅ base zerada |
| `revendedores` | 0 | |
| `payment_transactions` | 0 | |
| `payment_webhook_logs` | 0 | Sem webhook recebido ainda |
| `pack_access` / `pack_authorizations` / `pack_download_logs` | 0 / 0 / 0 | |
| `promocoes` / `banners` / `propagandas` | 0 / 0 / 0 | |
| `estoque` / `videos` / `logos` / `aulas` | 0 / 0 / 0 / 0 | ⚠️ **tabelas sem uso** |

### Consistência (✅ nenhum problema atual)
- Chaves duplicadas em `licencas` → **0** ✅
- Licenças ativas sem `email` → **0** ✅
- Licenças `status='ativa'` com `expira_em < now()` → **0** ✅
- `payment_transactions` aprovadas com `creditos_liberados=0` → **0** ✅
- `premium_packs` sem capa → **0** ✅
- `premium_packs` sem `drive_url` E sem `archive_url` → **0** ✅
- Promoções `ativo=true` já vencidas → **0** ✅
- Webhooks rejeitados últimos 7 dias → **0** ✅
- Pack downloads negados últimos 7 dias → **0** ✅

### Índices (✅ auditados por tabela crítica)
| Tabela | Índices relevantes | Diagnóstico |
|---|---|---|
| `licencas` | pkey, `chave_key` (uniq), `email_idx` (lower), `cliente_idx`, `revendedor_id_idx` | ✅ **cobre 100% dos hot paths** — corrige uma hipótese anterior de índices ausentes |
| `licencas_eventos` | `licenca_id + created_at DESC`, `tipo_idx` | ✅ OK |
| `notificacoes` | `rev_idx (revendedor,created DESC)`, `user_idx (user,created DESC)` | ✅ OK — corrige hipótese anterior |
| `pack_download_logs` | `pack_slug + created DESC`, `user_id + created DESC` | ✅ OK — corrige hipótese anterior |
| `payment_transactions` | `revendedor_id + created DESC` | ⚠️ **sem índice em `external_id` nem em `(gateway_slug, external_id)`** — o handler de webhook busca por essa dupla |
| `payment_webhook_logs` | somente pkey | ⚠️ sem índice em `gateway_slug` / `received_at`; ok enquanto pouco volume |
| `ai_prompts` | `numero`, `categoria`, `(ativo,oculto)` | ✅ OK |
| `ai_agents` | `numero`, `categoria` | ✅ OK |
| `premium_packs` | `categoria`, `created_at DESC`, `destaque` (partial), `downloads DESC`, `ordem` | ✅ OK |

**Problemas:**
| # | Prio | Item | Evidência | Correção |
|---|---|---|---|---|
| B1 | 🟠 Alta | Falta índice em `payment_transactions(gateway_slug, external_id)` | ✅ `pg_indexes` — usado por `handler.server.ts` linhas 96-102 | `CREATE INDEX payment_transactions_gw_ext_idx ON payment_transactions(gateway_slug, external_id)` |
| B2 | 🟡 Média | Falta índice em `payment_webhook_logs(received_at DESC)` e `(gateway_slug)` | ✅ | Duas CREATE INDEX simples |
| B3 | 🟡 Média | 4 tabelas com 0 rows e sem uso no código: `estoque`, `videos`, `logos`, `aulas` | ✅ `rg` mostra apenas o admin genérico (`admin.$resource`) tocando neles | Confirmar com o negócio antes de dropar; se ficar, remover do resource registry para não vazar como abas admin vazias |

### Funções SQL (24) ✅
Todas com `SET search_path TO 'public'` (ou `public, extensions`). Todas as `SECURITY DEFINER` que fazem escrita **checam permissão** antes (`has_role(auth.uid(),'admin')` ou owner via `current_revendedor_id()`).

- `validar_licenca(_email,_chave,_device_id)` — usa `FOR UPDATE`, cheia de checagens; retorna `jsonb` genérico `"Licença inválida ou expirada"` em todos os caminhos negativos (bom — não vaza motivo). ✅
- `gerar_licencas` — limita `_quantidade` a 500. ✅
- `add_credits` — abort se saldo ficar negativo. ✅
- `tg_pagamento_status` — auto-libera créditos ao aprovar; idempotente por `creditos_liberados=0`. ✅

**Achado sensível:** ⚠️ a RPC `validar_licenca` existe mas o endpoint público `/api/public/validar-licenca` **não a usa** — a rota duplicou toda a lógica em TypeScript usando `SUPABASE_SERVICE_ROLE_KEY` direto (ver §3/§8). Isso duplica manutenção e amplia superfície.

---

## 3. Relatório — Segurança

| # | Prio | Item | Arquivo/Linha | Evidência | Impacto | Correção |
|---|---|---|---|---|---|---|
| S1 | 🔴 Crítica | Endpoint `/api/public/validar-licenca` **sem rate limit** e com CORS `*` | `src/routes/api/public/validar-licenca.ts:22-27,52-72` | ✅ leitura direta do arquivo; ripgrep de `rate|throttle` só retorna sfx | Brute-force de chaves de licença por bots (25^20 é enorme, mas per-email é enumerável); custo de escrita em `licenca_acessos` sem limite | Adicionar throttle por IP (KV do Cloudflare ou tabela `rl_bucket`); restringir CORS ao domínio da extensão e do app |
| S2 | 🔴 Crítica | Nenhuma rota real em `_authenticated/`; gate é `useIsAuthed` client-side com fallback `localStorage` | `src/hooks/useIsAuthed.ts:20-38` + `ls src/routes/_authenticated`=∄ | ✅ | Flash de conteúdo autenticado; SSR entrega markup protegido; bots indexam | Criar `src/routes/_authenticated/route.tsx` (padrão Lovable, `ssr:false`) e mover `_app.*` para dentro |
| S3 | 🟠 Alta | Endpoint público usa `SUPABASE_SERVICE_ROLE_KEY` em vez da RPC `validar_licenca` que já existe | `src/routes/api/public/validar-licenca.ts:63` | ✅ | Bypassa RLS por design; duplica lógica; se lógica RPC evoluir, o endpoint ficará defasado | Substituir por: `createClient` publishable + `rpc("validar_licenca")` — a função é SECURITY DEFINER e faz tudo |
| S4 | 🟠 Alta | Webhooks: `verifySignature` **libera** quando `secret IS NULL` (`no-secret-configured`) | `src/lib/webhooks/gateway.server.ts:109` | ✅ leitura | Em modo teste é OK; em produção sem o secret cadastrado, aceita qualquer payload | Cadastrar `webhook_secret` em `payment_gateways` para cada gateway ativo (bloqueio operacional, não de código) |
| S5 | 🟡 Média | HIBP (Have I Been Pwned) não confirmado ativo | ⚠️ Hipótese — `configure_auth` não foi inspecionado | Senhas fracas podem passar | Ativar via Cloud → Users → Auth Settings → "Password HIBP Check" |
| S6 | 🟡 Média | `admin_password_gate` guarda senha admin, mas a RPC `verify_admin_password` é `STABLE SECURITY DEFINER` e não tem rate-limit | função SQL `verify_admin_password` | ✅ | Brute-force de senha admin | Adicionar contador em `admin_settings` ou tabela dedicada |
| S7 | 🟢 Baixa | 96 `as any` no client | ripgrep | ✅ | Types perdidos, refactors mais arriscados | Reduzir gradualmente conforme tocar em cada arquivo |

**Positivos ✅**
- `verifySignature` faz HMAC-SHA256 correto com `timingSafeEqual` — resiste a timing-attack (`gateway.server.ts:145-155`).
- Mercado Pago: monta o manifest `id:...;request-id:...;ts:...;` exatamente como o spec da MP.
- `supabaseAdmin` **nunca importado no client bundle** — sempre `await import()` dentro de handler.
- Todas as `SECURITY DEFINER` fixam `search_path`.

---

## 4. Relatório — Performance

### Frontend
| # | Prio | Item | Evidência | Correção |
|---|---|---|---|---|
| P1 | 🟠 Alta | Arquivos > 500 linhas: 12 (excl. autogen). Top 5 em código autoral: admin.pagamentos (1.212), admin.animacoes (1.101), PromptsLibraryShell (1.079), admin.$resource (882), _app.licencas (823) | ✅ `find + wc` | Split em subcomponents lazy |
| P2 | 🟡 Média | `_app.index.tsx` 728 linhas + `_app.tsx` monta `SoftParticles` (md+), `FirePromosButton`, `InnerPillMenu`, `WatermarkFooter`, `PwaInstallPrompt` simultaneamente | ✅ leitura | Baixo impacto real hoje; monitorar |
| P3 | 🟡 Média | 55 `useEffect` no client | ripgrep | ⚠️ Hipótese — provavelmente ok; auditar apenas os que dependem de dados |

### Backend (slow queries reais medidas)
Top-5 por tempo total (via `pg_stat_statements`):

| Query | Chamadas | Média (ms) | Total (ms) | Comentário |
|---|---|---|---|---|
| `clientes WHERE created_at >= $1 LIMIT` | 199 | 3.09 | 614.29 | Dashboard admin — ok |
| `v_dashboard_metricas` view | 198 | 2.67 | 528.62 | ✅ ok |
| `promocoes WHERE ativo=true AND inicio<=now AND fim>=now` | **10.346** | 0.04 | 445.90 | ⚠️ chamado com muita frequência (provavelmente hook global); mean 0.04ms é trivial mas **considerar cache local de 30s** |
| INSERT `prompt_history` | 23 | 12.71 | 292.25 | ok |
| `notificacoes ORDER BY created_at DESC LIMIT` | 194 | 0.47 | 91.87 | ok |

**Diagnóstico:** ✅ nenhuma slow query real hoje. A “hipótese de índices ausentes” da auditoria anterior fica **desmentida** — banco está saudável.

### Assets
- Fontes: Inter Variable ✅
- Imagens: `og:image` bem cadastrado no `__root.tsx`; sem `vite-imagetools`, sem AVIF/WebP conversion automática — ⚠️ hipótese: pode reduzir ~30% se implementar

---

## 5. Relatório — UX / UI

### Design System (memória)
Regra: "**Nunca hardcodar cor: sempre tokens de `src/styles.css`**".

**Violações confirmadas ✅**
- **244 usos** de `text-white` ou `bg-black` em arquivos `src/**` (ripgrep)
- **6 usos** de `bg-[#hexcode]` literal:
  - `AgentsLibraryShell.tsx:291` `bg-[#06060a]`
  - `PromptsLibraryShell.tsx:304,698,724,937` `bg-[#06060a]`, gradientes `from-[#0a0608]`
  - `AINovaDashboard.tsx:158` `bg-[#06030f] text-white`

**Impacto:** quebra dark-mode consistency; se o token `--background` evoluir, essas áreas ficam desalinhadas.
**Correção:** substituir por `bg-background`, `bg-card`, `text-foreground` ou tokens semânticos (`--ai-bg`).

| # | Prio | Item | Correção | Est. |
|---|---|---|---|---|
| U1 | 🟠 Alta | 244 `text-white`/`bg-black` | Substituir por `text-foreground`/`bg-background` gradualmente | 6h |
| U2 | 🟠 Alta | 6 `bg-[#hex]` em Prompts/Agents shells | Criar utility `bg-glass-deep` no `styles.css` | 1h |
| U3 | 🟡 Média | `FirePromosButton` + `InnerPillMenu` competem visualmente na parte de baixo | ⚠️ Hipótese confirmada por leitura do layout — ambos são `fixed bottom` | Verificar z-index e side-by-side |
| U4 | 🟡 Média | `WatermarkFooter` sempre presente mesmo em mobile | ✅ `_app.tsx:52` | Ocultar em `<md` |
| U5 | 🟢 Baixa | Componentes shadcn presentes: 46 em `components/ui/*` — auditar quais têm uso real | ripgrep por componente | 2h |

### Navegação
- `PageBackButton` global em `_app.tsx` ✅
- Rotas admin fora do `_app` (bom — layout distinto) ✅
- `mobile-bottom-nav.tsx` existe mas **não é importado** em lugar algum ✅ → **componente morto confirmado** (ver §14)

---

## 6. Relatório — Mobile (Android/iOS)

| Item | Estado |
|---|---|
| `capacitor.config.ts` presente | ✅ |
| `appId` | `app.lovable.mrsemlimites` |
| Modo | `server.url` → `https://mrsemlimites.lovable.app` (SSR remoto) |
| StatusBar / SplashScreen | Configurados com bg `#0a0a0f` |
| iOS `contentInset: always` + safe-area no CSS | ✅ (`_app.tsx` usa `env(safe-area-inset-*)`) |
| Native services em `src/native/` | 15 wrappers (Camera, Push, Biometric, Share, Clipboard, Deep Links, Files, Geolocation, Haptics, Microphone, Network, Permissions, Storage, Device, Browser) ✅ |
| Debug WebView Android desabilitado | ✅ (`webContentsDebuggingEnabled: false`) |
| `cleartext: false` + `androidScheme: https` | ✅ |

### Riscos
| # | Prio | Item | Correção |
|---|---|---|---|
| M1 | 🟠 Alta | App **quebra se o certificado da URL falhar** (100% online) | Ter bundle `webDir` mínimo empacotado como fallback |
| M2 | 🟡 Média | `limitsNavigationsToAppBoundDomains: false` no iOS | Considerar ligar para reduzir superfície |
| M3 | 🟢 Baixa | Landscape em tablet ⚠️ hipótese — não há CSS específico | Testar em iPad e ajustar `.pill-nav` |

---

## 7. Relatório — Loja & Checkout

### Estado atual (banco ✅)
- `produtos`: 1 registro (só o inicial)
- `estoque`: 0 (⚠️ tabela definida mas nunca populada — pode não ser usada)
- `checkout.tsx` (rota) ✅ existe
- `home-sections.tsx:280` navega com `window.location.href = "/checkout?produto=..."` — não usa `Link` do TanStack (perde preload e type safety)

### Achados
| # | Prio | Item | Evidência | Correção |
|---|---|---|---|---|
| L1 | 🟠 Alta | Uso de `window.location.href` no home | `home-sections.tsx:280` | Trocar por `<Link to="/checkout" search={{ produto: p.id }}>` |
| L2 | 🟡 Média | Sem produto órfão hoje (n=1), mas sem validação FK entre `produtos` e `estoque` | ⚠️ Hipótese estrutural | Adicionar `produtos.estoque_id` FK ou consolidar tabelas |
| L3 | 🟡 Média | `promocoes`/`banners`/`propagandas` todas 0 — ⚠️ pode ser features ainda desligadas | ✅ counts | Confirmar se são MVP; caso sim, esconder abas admin |

### Pagamentos
- 3 gateways cadastráveis via `payment_gateways`: `mercadopago`, `kiwify`, `cakto`
- Webhooks HMAC ✅ (§3)
- `approve_pagamento(_pagamento_id)` idempotente ✅

---

## 8. Relatório — Licenças

### Fluxo (validado em código + RPC)
1. Admin gera chaves via `gerar_licencas` (limite 500).
2. Cliente vincula via `atribuir_licenca_cliente(chave,cliente_id,email)`.
3. Validação externa (extensão/desktop) POSTa `/api/public/validar-licenca`.
4. Endpoint valida email + status + versao_min + max_dispositivos + fornecedor externo.
5. Log em `licenca_acessos`; registro em `licenca_dispositivos`.

### Achados críticos
| # | Prio | Item | Evidência | Correção |
|---|---|---|---|---|
| Lc1 | 🔴 Crítica | Endpoint sem rate-limit (repetido de S1) | `validar-licenca.ts` | ver §3 |
| Lc2 | 🟠 Alta | Endpoint reimplementa em TS o que a RPC `validar_licenca` já faz — divergências futuras são inevitáveis | comparar arquivo com função SQL | Consolidar em RPC |
| Lc3 | 🟠 Alta | Chave usa 20 chars alfanuméricos com `random()` (`gerar_chave_licenca`) — `random()` **não é criptograficamente seguro** | função SQL | Trocar por `encode(gen_random_bytes(15),'base32')` (via extensão pgcrypto) |
| Lc4 | 🟡 Média | `versao_min` compara com `cmpVersion` inline — funcao não vista, verificar suporte a semver | precisa ver linhas 250+ do arquivo | ⚠️ Hipótese — inspecionar |
| Lc5 | 🟢 Baixa | Cron `expirar_licencas_vencidas` / `expirar_trials_vencidos` existem mas execução recorrente não foi confirmada | ⚠️ Hipótese | Verificar `pg_cron` schedule |

### Consistência (✅ agora)
- 0 chaves duplicadas
- 0 ativas sem email
- 0 ativas expiradas

---

## 9. Relatório — Prompts

- 31 prompts, 31 ativos ✅
- Tabela `ai_prompts` (28 cols): `numero`, `categoria`, `ativo`, `oculto`, `titulo`, `prompt`, `descricao`, `favoritos`, `usos` etc
- Índices ✅ `numero`, `categoria`, `(ativo,oculto)`
- `prompt_favorites` (3 policies) e `prompt_history` (2 policies) ✅
- `prompt_classification_learning` (1 policy) — ML/tag auto ⚠️ ainda não confirmei se está sendo populada

### Achados
| # | Prio | Item | Evidência | Correção |
|---|---|---|---|---|
| Pr1 | 🟠 Alta | `PromptsLibraryShell.tsx` 1.079 linhas + `bg-[#06060a]` hardcoded 4× | ver §5 | Split + tokens |
| Pr2 | 🟡 Média | Copiar prompt já usa helper robusto `copyText` (`lib/clipboard.ts`) ✅ CORRIGIDO nesta sessão | — | — |
| Pr3 | 🟢 Baixa | Não há markdown/syntax highlight no visualizador | ⚠️ Hipótese — precisa confirmar | Adicionar `react-markdown` + `prism` |

---

## 10. Relatório — Agents

- 12 agents em `ai_agents` (28 cols)
- Índices em `numero`, `categoria` ✅
- `AgentsLibraryShell.tsx` 574 linhas
- Copiar agent também via `copyText` ✅

### Achados
| # | Prio | Item | Correção |
|---|---|---|---|
| Ag1 | 🟡 Média | Hardcode `bg-[#06060a]` em `AgentsLibraryShell.tsx:291` | Trocar por token |
| Ag2 | 🟢 Baixa | Sem UI para favoritar agent (só prompts têm `prompt_favorites`) | ⚠️ Hipótese — validar com usuário |

---

## 11. Relatório — Packs

- 1 pack cadastrado (`premium_packs` n=1)
- Todos com capa ✅, todos com `drive_url` OU `archive_url` ✅
- `pack_authorizations` (5 policies) + `pack_access` (2 policies) + `pack_download_logs` (1 policy) ✅
- `authorize_pack_download` faz log de tentativa negada — ✅ bom para auditoria
- `pack_client_has_access` respeita **dois caminhos**: `pack_authorizations` cadeia admin→revendedor→cliente E `pack_access` direto ✅

### Achados
| # | Prio | Item | Evidência | Correção |
|---|---|---|---|---|
| Pk1 | 🟡 Média | `pack_download_logs` sem policy para o dono ler os próprios logs (só 1 policy) | ✅ | Adicionar SELECT policy `auth.uid()=user_id` |
| Pk2 | 🟢 Baixa | `PackDetailPage.tsx` 530 linhas | ✅ | Split se crescer |
| Pk3 | 🟢 Baixa | Drive offline / ZIP corrompido / download interrompido — sem retry ou verificação de integridade | ⚠️ Hipótese | Adicionar hash SHA-256 em `premium_packs` |

---

## 12. Relatório — Dashboard Cliente

- Rotas `_app.perfil.tsx`, `_app.licencas.tsx`, `_app.packs.tsx`, `_app.aulas.tsx`, `_app.agents.tsx`, `_app.prompts.tsx`, `_app.creditos.tsx`, `_app.clientes.tsx`, `_app.index.tsx` ✅
- Layout com back button, safe-area, particles, pill menu ✅
- `PushBootstrapper` presente ✅
- `NetworkStatusWatcher` presente ✅

### Achados
| # | Prio | Item | Correção |
|---|---|---|---|
| Cl1 | 🟠 Alta | Todas essas rotas **estão em rotas públicas** (não `_authenticated/`) — repetido de S2 | Mover subtree |
| Cl2 | 🟢 Baixa | `_app.licencas.tsx` 823 linhas + `bg-[#hex]` não; usa clipboard direto duas vezes (`:321`, `:620`, `:546` read) | Migrar para `copyText` |

---

## 13. Relatório — Dashboard Admin

- 14 rotas admin: `admin.tsx` (layout) + 13 filhas + `admin.$resource` catchall genérico com **71 recursos** registrados
- Password gate via RPC `verify_admin_password` ✅
- Audit logs table (`audit_logs`, 13 cols) presente ✅

### Achados
| # | Prio | Item | Evidência | Correção |
|---|---|---|---|---|
| Ad1 | 🟠 Alta | `admin.pagamentos.tsx` 1.212 linhas | ✅ | Split |
| Ad2 | 🟠 Alta | `admin.animacoes.tsx` 1.101 linhas | ✅ | Split |
| Ad3 | 🟠 Alta | `admin.$resource.tsx` faz `(supabase as any).from(resource.table)` — perde types | linha 96, 120, 153 | Gerar tipo `TableName` derivado de `Database` |
| Ad4 | 🟡 Média | 71 keys em `resources.ts` — vários apontam para tabelas 0 rows (`estoque`, `videos`, `logos`, `aulas`) | ✅ | Esconder ou remover se features não vão evoluir |
| Ad5 | 🟡 Média | `verify_admin_password` sem rate-limit (S6 duplicado) | | ver §3 |

---

## 14. Relatório — Código Morto

### Componentes **não importados em lugar nenhum** (✅ ripgrep confirmou)
| Componente | LOC | Ação sugerida |
|---|---|---|
| `src/components/mobile-bottom-nav.tsx` | 55+ | **Deletar** — nenhum import |
| `src/components/biometric-toggle.tsx` | ~40 | **Deletar ou wire-up** — nenhum consumidor |

### Componentes **importados só transitoriamente** (revisar necessidade)
| Componente | Import | Ação |
|---|---|---|
| `SmartCover` | só `PromptsLibraryShell.tsx` | ✅ em uso |
| `soft-particles` | lazy em `_app.tsx` | ✅ em uso (mobile pula) |
| `promo-carousel` | em `_app.index.tsx` | ✅ em uso |
| `logout-incentive-dialog` | em `app-sidebar.tsx` | ✅ em uso |
| `watermark-footer` | em `_app.tsx` | ✅ em uso (mas U4) |

### Cast `any` que apagam types
- 96 ocorrências. Concentradas em `admin.$resource.tsx` (registry genérico) e alguns wrappers.

### Tabelas sem uso no código de app (só via `admin.$resource`)
- `estoque`, `videos`, `logos`, `aulas`, `imagens`, `carrossel_slides`, `payment_methods_config` → confirmar se ainda fazem sentido no roadmap.

---

## 15. Relatório — Dependências

- **74 dependências prod / 18 dev**
- Versões-chave: React 19.2, TanStack Start 1.168, Vite 8.0, Tailwind 4.2, Capacitor 8.4, Supabase-js 2.110
- `bunfig.toml` + `bun` para install; scripts native em `scripts/`
- ⚠️ Hipótese: bundle não analisado — `bunx vite-bundle-visualizer` daria os top chunks. Não executado nesta auditoria (rodar em fase 3).

---

## 16. Plano de Correção — Fases

### Fase 1 — Crítico (bloqueia produção segura) — **~10h**
1. **S1**: Rate-limit no `/api/public/validar-licenca` (KV do Cloudflare ou tabela `rate_limits`) + CORS restrito. **3h**
2. **S2 / A1 / Cl1**: Criar `src/routes/_authenticated/route.tsx` com `ssr:false` + `beforeLoad: supabase.auth.getUser()`; mover todas as rotas `_app.*` para dentro. **4h**
3. **Lc3**: Trocar `gerar_chave_licenca` para usar `gen_random_bytes` (migration curta). **1h**
4. **S6**: Rate-limit em `verify_admin_password` (tentativas por IP em `admin_settings.lockout_until`). **2h**

### Fase 2 — Segurança & Consistência — **~8h**
5. **S3 / Lc2**: Consolidar endpoint público em cima da RPC `validar_licenca`. **3h**
6. **S4**: Cadastrar `webhook_secret` para cada gateway ativo (operacional). **0.5h**
7. **B1 / B2**: Índices em `payment_transactions(gateway_slug,external_id)` e `payment_webhook_logs(received_at, gateway_slug)`. **0.5h**
8. **Pk1**: SELECT policy dono em `pack_download_logs`. **0.5h**
9. **L1**: `home-sections.tsx` trocar `window.location.href` por `<Link>`. **0.5h**
10. **S5**: Ativar HIBP no Auth. **0.25h**
11. **Ad5**: Auditar RLS de todas as tabelas com apenas 1 policy (`aulas`, `estoque`, `imagens`, `videos`, `creditos_packs`, `payment_gateways`, `payment_methods_config`, `payment_webhook_logs`, `prompt_classification_learning`, `pack_download_logs`). **2h**

### Fase 3 — Performance / Modularização — **~18h**
12. **A3 / Ad1**: Split `admin.pagamentos.tsx` (1.212 → 4 arquivos <400 linhas). **6h**
13. **A5 / Ad2**: Split `admin.animacoes.tsx`. **3h**
14. **A2**: Split `_app.index.tsx`. **2h**
15. **Pr1**: Split `PromptsLibraryShell.tsx` + tokens. **3h**
16. **A4**: Split `resources.ts` por domínio. **2h**
17. **P3**: Bundle-visualizer + tree-shake check. **2h**

### Fase 4 — Polimento & UX — **~12h**
18. **U1**: Substituir 244 `text-white`/`bg-black` por tokens (grep-driven, um domínio por vez). **6h**
19. **U2 / Ag1**: Utility `bg-glass-deep` para os 6 hardcodes de hex. **1h**
20. **U3 / U4**: Reorganizar bottom-bar (`FirePromosButton` + `InnerPillMenu` + `WatermarkFooter`). **2h**
21. **Cl2**: Migrar todas as chamadas `navigator.clipboard.writeText` restantes para `copyText`. **1h**
22. **B3 / Ad4**: Remover tabelas/recursos admin sem uso após confirmação do negócio. **1h**
23. **M1**: Fallback offline mínimo para Capacitor. **1h**

**Total estimado: ~48h** (mesmo escopo Enterprise "faça sem quebrar nada").

---

## Anexo A — Hipóteses da auditoria anterior que este relatório **derrubou**

| Hipótese anterior | Realidade |
|---|---|
| "Índices ausentes em `notificacoes` e `pack_download_logs`" | ❌ Ambos têm índices compostos ordenados por `created_at DESC` |
| "Tabelas talvez duplicadas: `payment_gateways` + `payment_methods_config`" | ⚠️ Não são duplicadas; são complementares (gateway = provedor, methods = pix/cartão/boleto por gateway). Ambas populadas por 1 policy — auditar se estão em uso |
| "Provável tree-shake incompleto" | ⚠️ Não medido — nem confirmar nem desmentir sem `vite-bundle-visualizer` |
| "Realtime pode..." | ❌ Slow query log de 24h não mostra realtime pesado; canal de notificações está sob controle |
| "Landscape não testado" | ⚠️ Continua verdadeiro — precisa de Playwright em iPad viewport |

## Anexo B — Regras respeitadas nesta auditoria
- ❌ Não implementei nada
- ❌ Não alterei arquivos (exceto criar este relatório)
- ❌ Não criei migrations
- ❌ Não modifiquei banco
- ❌ Não alterei rotas
- ❌ Não publiquei

Fim do relatório.
