# Auditoria do Painel Admin — Fase 0

Data: 2026-07-14
Escopo: apenas leitura. Nada foi alterado no banco ou nas rotas nesta fase.
(Único fix aplicado à parte: hidratação da sidebar `useIsAuthed`, para eliminar o erro de hydration mismatch que aparecia no console.)

Legenda de severidade:
- 🟢 OK — funciona com dados reais.
- 🟡 Melhorar — funciona mas pode ficar mais profissional.
- 🔴 Corrigir — incompleto, quebrado, ou mocka dado.

---

## 1. Rotas do admin encontradas

Total: 17 rotas em `src/routes/admin.*.tsx` + o CRUD genérico `admin.$resource.tsx` que atende 16 recursos.

### Páginas fixas

| Rota | Status | Observação |
|---|---|---|
| `/admin` (`admin.index.tsx`) | 🟢 | Grid de módulos com `count` real via `supabase.from(table).select('id',{count:'exact',head:true})`. |
| `/admin/home` (`admin.home.tsx`) | 🟢 | 4 queries reais (banners, promoções, videos, etc). |
| `/admin/modulos` | 🟢 | CRUD real em `system_modules`. |
| `/admin/configuracoes` | 🟢 | Real, edita `admin_settings`. |
| `/admin/personalizacao` | 🟢 | Real, edita tema. |
| `/admin/animacoes` | 🟢 | Snippets/preview real. |
| `/admin/sons` | 🟢 | Playback de `admin-media` bucket. |
| `/admin/usuarios` | 🟡 | Lista só `user_roles` (só admin aparece). Não mostra revendedores nem clientes — faltando visão unificada. |
| `/admin/loja` | 🟢 | Hub de atalhos (só navegação, ok). |
| `/admin/loja-produtos` | 🟢 | Editor premium com upload real. |
| `/admin/pagamentos` | 🟡 | Gateways reais mas UI muito longa (1.2k linhas); alguns switches sem persistência clara. Precisa revisão pontual. |
| `/admin/ajustar-creditos` | 🟢 | Muta saldo real via RPC. |
| `/admin/seguranca` | 🟢 | Real, `set_admin_password` RPC. |
| `/admin/pack-autorizacoes` | 🟢 | CRUD real. |
| `/admin/backup` | 🟡 | Só 2 queries; funcionalidade limitada — precisa expor export por tabela. |
| `/admin/licencas-dashboard` | 🟢 | Métricas reais de `licencas` / `licencas_eventos`. |

### CRUD genérico (`admin.$resource.tsx`, definidos em `src/lib/admin/resources.ts`)

Recursos ativos: `licencas`, `licenca_produtos`, `produtos`, `planos`, `banners`, `carrossel_slides`, `videos`, `aulas`, `promocoes`, `propagandas`, `notificacoes`, `revendedores`, `clientes`, `logos`, `imagens`, `estoque`.

Todos usam PostgREST com RLS. Cobertura CRUD OK, mas:

- 🟡 `promocoes` — falta filtro por revendedor no admin; hoje mostra todas juntas.
- 🟡 `revendedores` — sem visão de "clientes/licencas/saldo" agregada por linha.
- 🟡 `clientes` — sem coluna `whatsapp`, `cpf`, `empresa` (só `nome/email/telefone/status`). Cadastro exigido pelo escopo tem mais campos.
- 🟡 `notificacoes` — sem separação "campanha" vs "individual".

---

## 2. Lacunas de estrutura (o que ainda não existe)

| Item | Onde deveria estar | Fase |
|---|---|---|
| Painel exclusivo do **revendedor** (`/revendedor/*`) | Não existe. Revendedor entra em `/dashboard` que é do cliente. | 2 |
| Cadastro público com `revendedor_id` na URL | Não implementado. | 3 |
| Página admin **Clientes** com filtro por revendedor/produto/status/última compra | `admin.$resource.tsx?resource=clientes` só lista raw. | 3 |
| Painel de **Licenças** com abas Teste/Premium/Expiradas/Canceladas/Bloqueadas/Todas | Hoje uma tabela só via `admin.$resource.tsx?resource=licencas`. | 4 |
| Botão **Restaurar Dispositivo** com registro de motivo | Existe RPC `resetar_device_licenca`, mas sem UI dedicada nem input de motivo. | 4 |
| Coluna "Nível" (Master/Revenda/Cliente) em licenças | Não existe. | 4 |
| Central de **Comunicação** (WhatsApp / campanhas) | Não existe. | 6 |
| **Cupons** com código único | Coluna não existe em `promocoes`. | 5 |
| **Relatórios** (receita, conversão, dispositivos, ativações) | Só métricas soltas em `admin.licencas-dashboard.tsx`. | 7 |

---

## 3. Hierarquia atual no banco

Boa notícia: a base já existe.

- `revendedores.auth_user_id` → `auth.users.id` (pivô master).
- `clientes.revendedor_id` → `revendedores.id`.
- `licencas.revendedor_id` e `licencas.cliente_id`.
- `payment_transactions.revendedor_id`.
- RLS já aplica `current_revendedor_id()` na maioria das tabelas.
- Função `has_role(user_id, 'admin')` para bypass do master.

Falta:
- Trigger que respeita `raw_user_meta_data->>'revendedor_id'` no cadastro (hoje `tg_auth_user_to_cliente` só faz upsert sem herdar revendedor).
- View consolidada `v_hierarquia` (opcional; ajuda o dashboard).
- Colunas em `clientes`: `whatsapp`, `cpf`, `empresa`.
- Em `promocoes`: `codigo_cupom`, `desconto_percent`, `desconto_valor`.
- Tabela nova para campanhas de comunicação.

---

## 4. Botões e ações — varredura rápida

Todos os `onClick={...}` inline em `admin.*.tsx` foram inspecionados. Nenhum handler vazio ou `() => {}` genérico. Ações mais frágeis:

- `admin.pagamentos.tsx:420` — `set("environment", env)` mexe em estado local mas nem sempre persiste no banco (`payment_gateways.environment`). ⚠️ Verificar na Fase 2.
- `admin.pack-autorizacoes.tsx:309` — `revokeMut.mutate(r.id)` OK.
- `admin.$resource.tsx:189` — abre modal de criação (OK).

Não há botões falsos ("em breve", `alert(...)`, `TODO`) — o único match de "mock" no repo é a string comentada em `admin.pagamentos.tsx`.

---

## 5. Dados mockados encontrados

- **Nenhum card ou gráfico do admin usa número fixo.** Todos os contadores em `admin.index.tsx` e `admin.licencas-dashboard.tsx` vêm de `supabase --count`.
- `admin.home.tsx` puxa dados reais.
- Cards "vazios" mostram `—`, o que é o comportamento correto quando não há dado.

Não precisa de "descobrir mock" — precisa de **completar telas que faltam** (Fase 2 em diante).

---

## 6. Ordem de execução recomendada

Você pediu por fases. Sugestão priorizando o que trava as demais:

1. **Fase 1 — Hierarquia + colunas faltantes em `clientes`/`promocoes`.**
   Migration única. Sem quebra de front.
2. **Fase 4 — Licenças com abas + Restaurar Dispositivo + motivo.**
   É a página que você citou em mensagens anteriores e é pura UI sobre RPCs que já existem.
3. **Fase 3 — Clientes: form completo no admin + herdar `revendedor_id` no signup.**
4. **Fase 5 — Promoções por revendedor + cupons.**
5. **Fase 2 — Painel do revendedor (`/revendedor/*`).** Vira o "nível 2" completo.
6. **Fase 6 — Central de Comunicação (estrutura, sem envio).**
7. **Fase 7 — Dashboard e Relatórios consolidados.**

---

## Próximo passo

Aguardando sua confirmação para começar a **Fase 1** (migration da hierarquia + colunas). Ela é curta, aditiva (só `ADD COLUMN IF NOT EXISTS`), e não muda nada do que já funciona.

Se preferir outra ordem, me diga qual fase entra primeiro.
