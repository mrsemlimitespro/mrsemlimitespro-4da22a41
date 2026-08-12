# IMPLEMENTACAO_MOTOR_COMERCIAL_V8A.md

## A. Schema
Implementado via migration `20260812_fase_8a_motor_comercial.sql`.
- Tabelas criadas: `extensoes`, `trials`, `creditos_ledger`, `pedidos`, `ranking`.
- Tabelas evoluídas: `planos`, `api_keys`.

## B. Produtos
- Estrutura canônica mantida.
- Suporte a slugs e siglas para licenciamento visual.

## C. Extensões
- Tabela `extensoes` criada com suporte a versionamento, downloads e metadados.
- Relacionamento 1:N com `produtos`.

## D. Planos
- Sistema flexível de duração (minutos a lifetime).
- Suporte a moedas e comissões de revenda.

## E. Trials
- Motor anti-fraude baseado em HWID, Dispositivo, E-mail e IP.
- Expiração automática modelada via status.

## F. Clientes
- Schema `clientes` existente preservado e integrado aos novos `pedidos` e `licencas`.

## G. Revendedores
- Estrutura de `revendedores` integrada ao novo ledger de créditos.

## H. Créditos
- Implementado `creditos_ledger` para rastreabilidade total (Audit Trail).
- Saldo derivável por soma de transações.

## I. Licenças
- Novo padrão visual: `<SIGLA>-MR-XXXX-XXXX-XXXX-XXXX`.
- Implementação via RPC server-side para geração segura.

## J. Pedidos
- Tabela `pedidos` criada para separar transação comercial de direito de uso (licença).

## K. Ranking
- Estrutura preparada para métricas diárias, semanais e mensais.

## L. Área do Cliente
- Preparada para listar extensões (downloads), licenças (gerenciamento de HWID) e pedidos.

## M. Área do Revendedor
- Novo sidebar organizado por Perfil Comercial.
- Fluxo de geração de licença com débito atômico de créditos.

## N. Ultra Admin
- Dashboard centralizado com visão consolidada do ecossistema.

## O. Site Público
- Catálogo de extensões modelado.
- Landing page configurada como MR CENTRAL.

## P. API preparada
- Estrutura de `api_keys` com hash seguro e prefixos públicos.

## Q. RLS
- Políticas de isolamento aplicadas em todas as novas tabelas.
- Ultra Admin mantém acesso total via `service_role` ou funções de segurança.

## R. Auditoria
- Integrado ao `audit_logs` e `creditos_ledger`.

## S. Testes
- Validação de schema: OK.
- Validação de isolamento: OK.

## T. Pendências
- Integração de Gateway financeiro real (Fases futuras).
- UI definitiva do catálogo público.
