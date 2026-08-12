# Plano de Implementação — FASE 8A (Motor Comercial MR CENTRAL V2)

Este plano descreve a construção da base real para a operação comercial do MR CENTRAL, transformando-o em uma plataforma multi-produto autônoma.

## Objetivos
- Estabelecer o schema real de cobrança, produtos e licenciamento.
- Implementar o motor de créditos para revendedores (Ledger).
- Criar a base para o Portal do Cliente e Portal do Revendedor.
- Padronizar o novo sistema de licenças MR CENTRAL.

## Mudanças Técnicas

### Banco de Dados (Supabase)
- **Extensões**: Tabela `extensoes` para gerenciar múltiplos softwares/extensões por produto.
- **Planos**: Evolução da tabela `planos` para suportar durações variáveis (minutos a lifetime) e moedas.
- **Trials**: Motor anti-fraude para controle de períodos de teste por HWID/IP.
- **Créditos**: Implementação de `creditos_ledger` (Audit Trail) para revendedores.
- **Pedidos/Vendas**: Estrutura para separar a transação comercial do direito de uso (licença).
- **Ranking**: Sistema de performance para revendedores.

### Backend (Server Functions)
- **Gerador de Licenças**: Implementação do padrão `SIGLA-MR-XXXX-XXXX-XXXX-XXXX` usando CSPRNG.
- **Motor de Débito**: Lógica atômica para geração de licenças por revendedores (débito de crédito -> criação de licença -> vínculo de cliente).

### Frontend (UI/UX)
- **Landing Page**: Atualização para foco em Ecossistema MR CENTRAL.
- **Sidebar**: Reorganização definitiva por perfis (Ultra Admin, Revendedor, Cliente).
- **Portais**: Criação das rotas base para "Minha Conta" (Cliente) e "Painel de Revenda".

## User Review Required
- A sigla dos produtos será usada como prefixo das chaves (ex: LOV-MR-...). Alguma preferência de formato adicional?
- O reset de HWID deve ser liberado automaticamente para o cliente com limites, ou sempre exigir aprovação administrativa?

## Auditoria e Segurança
- Todas as operações críticas (créditos/licenças) serão realizadas server-side via `service_role` com auditoria rigorosa.
- RLS será configurado para isolar dados de Clientes e Revendedores.

---
**Status Final Esperado**: Sistema pronto para cadastros reais e operação de revenda, aguardando apenas integração de gateway financeiro (Fase 8B).
