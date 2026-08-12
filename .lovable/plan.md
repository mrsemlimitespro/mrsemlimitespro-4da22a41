# Reorganização Mobile-First + Aba Revendedores + PWA

Escopo cirúrgico: só toca navegação, agrupamento visual e a nova tela de Revendedores. Todas as rotas, fluxos, licenças, checkout, extensão, login e permissões continuam iguais — só mudam como o usuário chega até elas no mobile.

## 1. Nova Bottom Nav (5 grupos, sem scroll horizontal)

Reescrever `src/components/mobile-bottom-nav.tsx` com exatamente 5 abas fixas (flex-1, sem overflow):

| Aba | Rota-hub | Agrupa |
|---|---|---|
| Início | `/` | Home |
| Ferramentas | `/ferramentas` (nova) | Agents, Packs, Prompts, Extensão |
| Loja | `/loja` (nova) | Loja, Meus Clientes*, Meu Estoque*, Créditos Lovable, Comprar Chaves |
| Gestão | `/gestao` (nova) | Clientes, Licenças, **Revendedores (novo, admin-only)** |
| Perfil | `/perfil` | Perfil, Aulas, Créditos, Configurações, Notificações |

\*"Meus Clientes" e "Meu Estoque" já existem hoje dentro da Loja; permanecem como sub-abas.

O `matchTab` marca a aba ativa quando a rota atual é o hub OU qualquer rota agrupada nele (ex: `/licencas`, `/clientes`, `/admin/revendedores-gestao` → aba Gestão ativa).

## 2. Hubs = páginas com sub-navegação horizontal

Cada hub novo (`/ferramentas`, `/loja`, `/gestao`) é uma rota TanStack simples que renderiza um componente `<HubTabs />` com abas horizontais roláveis (padrão já usado hoje na Loja). Cada aba renderiza o **conteúdo da rota original re-exportado** — não duplica lógica:

```
src/routes/_app.ferramentas.tsx   → tabs: Agents | Packs | Prompts | Extensão
src/routes/_app.loja.tsx          → tabs: Loja | Meus Clientes | Estoque | Créditos | Comprar Chaves
src/routes/_app.gestao.tsx        → tabs: Clientes | Licenças | Revendedores (admin)
```

As rotas antigas (`/agents`, `/packs`, `/prompts`, `/licencas`, `/clientes`, etc.) **continuam existindo** para deep-links, sidebar desktop e links internos. Os hubs são atalhos mobile — a URL da aba ativa reflete a sub-rota real (`?tab=agents` ou navegação direta) pra preservar back button e refresh.

## 3. Aba Revendedores (admin-only, dentro de Gestão)

Nova sub-aba `Revendedores` visível só para `role === "admin"`. Reusa a lógica que já existe em `/admin/revendedores-gestao`:

- Lista (nome, e-mail, status ativo/inativo)
- Busca por e-mail
- Botão "Novo revendedor" (mesmo modal atual → Magic Link)
- Por revendedor: contagem de licenças/testes gerados + toggle bloquear/desbloquear
- Deixa claro na UI: "Painel Revendedor" (rota `/revendedor`, visão dele) ≠ "Revendedores" (visão admin sobre todos)

Se já existe conteúdo em `/admin/revendedores-gestao`, a aba renderiza o mesmo componente — não recria a tela do zero.

## 4. Sidebar desktop (`app-sidebar.tsx`)

Mantém itens individuais como hoje (desktop tem espaço). Só adiciona o item "Revendedores" no bloco admin apontando pra `/admin/revendedores-gestao`. Sem quebras.

## 5. Empty states

Substituir textos soltos ("Sem atividade ainda", "Nenhum registro ainda") por um componente `<EmptyState icon title description action />` reutilizável com ilustração leve (ícone lucide + gradiente do design system). Aplicar em: Agents (Atividade Recente), Packs (lista vazia), Prompts (histórico), Clientes (lista vazia), Notificações.

## 6. PWA polish

Manifest e ícones já existem (`public/manifest.webmanifest`, 192/512/maskable). Verificar:
- `theme_color` e `background_color` batem com o dark atual (#0b0716 ✔)
- Splash respeitando safe-area no iOS (`apple-touch-icon` no `__root.tsx` head)
- Nenhum service worker ativo hoje que faça cache-first (regra Lovable) — só manifest-only, que é o correto pra "instalável"
- Bottom nav respeita `env(safe-area-inset-bottom)` (já respeita)

Nada de service worker novo — instalabilidade já funciona com manifest.

## 7. O que NÃO muda

- Nenhuma rota antiga é removida
- Nenhum componente de licença, checkout, extensão, anti-tamper, login é alterado
- SDK da extensão, endpoints `/api/public/*`, banco: intocados
- Design system (tokens, gradientes, glass) preservado

## Arquivos

**Novos:**
- `src/routes/_app.ferramentas.tsx`
- `src/routes/_app.loja.tsx`
- `src/routes/_app.gestao.tsx`
- `src/components/hub-tabs.tsx` (sub-nav horizontal reutilizável)
- `src/components/empty-state.tsx`

**Editados:**
- `src/components/mobile-bottom-nav.tsx` (5 abas com matches expandidos)
- `src/components/app-sidebar.tsx` (adiciona "Revendedores" no bloco admin)
- 4–5 telas que hoje têm empty state solto (aplicar `<EmptyState />`)

Confirma pra eu executar?