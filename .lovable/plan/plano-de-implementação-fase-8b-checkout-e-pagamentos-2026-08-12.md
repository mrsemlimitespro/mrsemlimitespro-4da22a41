# Plano de Implementação - Fase 8B (Checkout e Pagamentos)

## 1. Auditoria de Integrações
- **Mercado Pago**: Parcial (Webhook em `src/routes/api/public/webhooks/mercadopago.ts`).
- **Kiwify**: Parcial (Webhook e provisão de revendedor em `src/lib/revendedores/provision.server.ts`).
- **Cakto**: Parcial (Webhook).
- **Checkout**: `src/routes/checkout.tsx` existe, mas foca em revendedores/packs.

## 2. Abstração de Pagamentos
Criar `src/lib/payments/service.server.ts` para abstrair operações de checkout e consulta de status.

## 3. Modelo de Dados Incremental
- `payment_transactions` já existe.
- Adicionar suporte a `extensoes` e `planos` no fluxo de checkout público.

## 4. Checkout Público MR CENTRAL
- Criar `src/routes/comprar.$slug.tsx` para checkout de produtos/extensões específicos.
- Implementar proteção de preço (backend-only).

## 5. Webhook e Fulfillment
- Integrar `processEvent` em `src/lib/webhooks/handler.server.ts` com o novo motor de licenciamento (`src/lib/comercial.functions.ts`).
- Garantir idempotência total.

## 6. Notificações
- Utilizar `email_queue` existente.

## 7. Testes Sandbox
- Validar fluxos via Mercado Pago Sandbox e Kiwify Test Mode.
