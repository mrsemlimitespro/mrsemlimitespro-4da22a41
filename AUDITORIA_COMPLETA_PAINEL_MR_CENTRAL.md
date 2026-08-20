# AUDITORIA COMPLETA PAINEL MR CENTRAL

Mapeamento de rotas, componentes e fontes de dados para transição definitiva de dados reais.

## 1. Mapeamento de Rotas e Componentes

| Rota/página | Componente responsável | Fonte real de dados (Supabase) | Ação disponível | Permissão | Estado atual |
| --- | --- | --- | --- | --- | --- |
| /admin | src/routes/admin.index.tsx | public.user_roles, dashboards KPIs | Visualizar métricas | Ultra Admin / Admin | 🟢 Funcional (via server function) |
| /admin/licencas | src/routes/admin.licencas.tsx | public.licencas | CRUD Licenças, Bloqueio | Admin | 🟢 Real (Supabase direct) |
| /admin/clientes | src/routes/admin.clientes.tsx | public.clientes + licencas | Visualizar e Gerenciar Clientes | Admin | 🟢 Real (Supabase direct) |
| /admin/revendedores | src/routes/admin.revendedores-gestao.tsx | public.revendedores | Gerenciar Revendedores | Ultra Admin | 🟢 Real (Supabase direct) |
| /admin/vendas | src/routes/admin.pagamentos.tsx | public.payment_transactions | Auditoria de Pagamentos | Admin | 🟢 Real (Supabase direct) |
| /dashboard | src/routes/_app.dashboard.tsx | v_dashboard_metricas + access_logs | Resumo da conta | Cliente / Revendedor | 🟢 Real (Supabase direct) |
| /licencas | src/routes/_app.licencas.tsx | public.licencas (filtro auth.uid) | Ativar / Ver detalhes | Cliente / Revendedor | 🟢 Real (Supabase direct) |
| /clientes | src/routes/_app.clientes.tsx | public.clientes | Gerenciar clientes finais | Revendedor | 🟢 Real (Supabase direct) |

## 2. Inventário de Dados Estáticos / Mocks Detectados

A auditoria realizada confirmou que o projeto **não utiliza arrays de mock estáticos** nas rotas principais. Todas as rotas consultadas já utilizam `supabase.from` ou `useServerFn`.

**O que foi identificado:**
- **Estado Vazio Confiável:** A mensagem "Nenhuma licença encontrada nesta aba" no `/admin/licencas` é um reflexo real do banco, não um mock.
- **KPIs Dinâmicos:** O dashboard admin usa a server function `getDashboardStats` que consulta contagens reais do banco (clientes, revendedores, licenças, etc).

## 3. Segurança e RLS

- As tabelas `licencas`, `clientes`, `revendedores` e `payment_transactions` possuem RLS ativada e políticas baseadas em `auth.uid()` ou roles (`has_role`).
- O backend da extensão em `/api/public/ext/*` utiliza `supabaseAdmin` para operações críticas, garantindo funcionamento independente de RLS para a API da extensão, enquanto o painel respeita rigorosamente as permissões do usuário logado.

## 4. Conclusão da Auditoria

O painel **está integralmente conectado a dados reais**. As áreas que parecem vazias refletem a ausência de dados no banco de dados atual. O sistema está pronto para operação comercial com dados vivos.

---
Auditoria concluída em 20/08/2026.
