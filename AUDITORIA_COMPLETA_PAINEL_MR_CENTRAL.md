# AUDITORIA COMPLETA PAINEL MR CENTRAL

Mapeamento de rotas, componentes e fontes de dados para transição definitiva de dados reais.

## 1. Mapeamento de Rotas e Componentes

| Rota/página | Componente responsável | Fonte real de dados (Supabase) | Ação disponível | Permissão | Estado atual |
| --- | --- | --- | --- | --- | --- |
| /admin | src/routes/admin.index.tsx | public.user_roles, dashboards KPIs | Visualizar métricas | Ultra Admin / Admin | Mapeado |
| /admin/licencas | src/routes/admin.licencas.tsx | public.licencas | CRUD Licenças, Bloqueio | Admin | Pendente dados reais |
| /admin/clientes | src/routes/admin.clientes.tsx | auth.users + perfis (se houver) | Visualizar e Gerenciar Clientes | Admin | Pendente integração |
| /admin/revendedores | src/routes/admin.revendedores-gestao.tsx | public.user_roles + perfis | Gerenciar Revendedores | Ultra Admin | Pendente integração |
| /admin/vendas | src/routes/admin.pagamentos.tsx | public.pedidos / public.vendas | Auditoria de Pagamentos | Admin | Pendente dados reais |
| /admin/loja | src/routes/admin.loja-produtos.tsx | public.produtos | Editar Catálogo | Admin | Funcional |
| /dashboard | src/routes/_app.dashboard.tsx | User Profile + Licenças | Resumo da conta | Cliente / Revendedor | Parcialmente funcional |
| /licencas | src/routes/_app.licencas.tsx | public.licencas (filtro user_id) | Ativar / Ver detalhes | Cliente / Revendedor | Placeholder detectado |
| /clientes | src/routes/_app.clientes.tsx | public.licencas (filtro revendedor_id) | Gerenciar clientes finais | Revendedor | Placeholder detectado |

## 2. Inventário de Dados Estáticos / Mocks Detectados

- **src/routes/_app.licencas.tsx**: Possui filtros e estados que podem estar usando mocks locais.
- **src/routes/_app.clientes.tsx**: Referenciado como tendo "cards e contagens" que podem ser decorativos.
- **Métricas no Dashboard**: KPIs calculados em `src/lib/admin/dashboard.functions.ts` precisam ser validados contra o banco real.

## 3. Plano de Ação Imediata

1.  **Auditoria de Schema**: Validar se tabelas estão com RLS ativas e GRANTs corretos.
2.  **Remoção de Mocks**: Substituir arrays de dados fictícios por chamadas ao Supabase.
3.  **Implementação de RLS**: Garantir que revendedor veja apenas seus clientes e licenças.
4.  **Validação de Endpoints da Extensão**: Testar endpoints com dados reais do banco.

---
Auditoria iniciada em 20/08/2026.
