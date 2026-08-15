# Plano de Implementação — ITEM 5

Implementação dos módulos operacionais (Contatos, Campanhas, Filas e Webhooks) com isolamento por Workspace.

## 1. Banco de Dados (Drizzle Schema)
Adicionar tabelas para suportar as funcionalidades operacionais:
- `contacts`: Armazena contatos isolados por workspace.
- `contact_groups`: Segmentação de contatos.
- `campaigns`: Definição de campanhas de disparo.
- `campaign_queue`: Fila de mensagens a serem disparadas.
- `dispatch_logs`: Histórico detalhado de disparos.
- `webhooks`: Configurações de webhooks recebidos da Evolution API.

## 2. Backend (tRPC Routers)
- `contactsRouter`: CRUD de contatos e importação.
- `campaignsRouter`: Gestão de campanhas e lógica de disparo/fila.
- `webhooksRouter`: Gestão de endpoints para integração externa.
- **Smart API Logic**: Implementar rotação de instâncias no processador de fila para evitar banimentos.

## 3. Frontend (UI Dashboard)
- **Contatos**: Tela de listagem, filtros e importação (CSV/Manual).
- **Campanhas**: Formulário de criação com seleção de instâncias e agendamento.
- **Fila/Logs**: Visualização em tempo real do status de envio.
- **Webhooks**: Gestão de URLs de callback.

## Arquivos a serem modificados:
- `drizzle/schema.ts`
- `server/routers.ts`
- `server/routers/contacts.ts` (Novo)
- `server/routers/campaigns.ts` (Novo)
- `server/routers/webhooks.ts` (Novo)
- `src/pages/Home.tsx` (Integração das novas abas)
- `src/components/DashboardLayout.tsx` (Links de navegação)

## Segurança e Isolamento
Todas as queries tRPC incluirão obrigatoriamente `workspaceId` vindo do contexto ou input validado, garantindo que o Usuário A nunca veja dados da Empresa B.
