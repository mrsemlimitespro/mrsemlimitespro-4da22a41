# GO-LIVE FINANCEIRO — MR CENTRAL V2
Status: 🟡 AGUARDANDO CREDENCIAIS LIVE
Data: 2026-08-12

## 1. Auditoria de Configuração LIVE
- **Mercado Pago LIVE**: NÃO CONFIGURADO (Sandbox ativo)
- **Kiwify LIVE**: NÃO CONFIGURADO
- **Cakto LIVE**: NÃO CONFIGURADO
- **E-mail**: PENDENTE (Provider não configurado)
- **WhatsApp**: PENDENTE (Provider não configurado)

## 2. Secrets & Segurança
- **Secrets no Frontend**: NÃO (Confirmado via auditoria forense)
- **Cofre**: Gerido via Lovable Secrets / Environment Variables.
- **RLS**: Ativo e validado para isolamento de clientes e revendedores.

## 3. Preparação do Produto de Produção
- **Produto Real**: PRONTO (Sigla LOV mapeada no Fulfillment)
- **Plano Real**: PRONTO (Preços buscados server-side)
- **Licenciamento**: Motor CSPRNG validado para padrão `<SIGLA>-MR-XXXX-XXXX-XXXX-XXXX`.

## 4. Checkout & Fulfillment (E2E)
- **Busca de Preço Server-side**: SIM (Proteção contra manipulação no browser)
- **Idempotência**: PASSOU (Lock via `fulfilled_at` nos metadados da transação)
- **Fulfillment**: Pedido -> Pagamento -> Licença -> Notificação (Fila).

## 5. Webhooks de Produção
- **Endpoint**: `https://id-preview--219cca7e-5961-4a3d-8913-3023bcbe8103.lovable.app/api/public/webhooks/<provider>`
- **Validação de Assinatura**: Ativa para todos os providers (Mercado Pago, Kiwify, Cakto).

## 6. Primeira Transação Real Supervisionada
- **Status**: NÃO EXECUTADA
- **Motivo**: Ausência de credenciais LIVE.
- **Passo Necessário**: Ultra Admin deve configurar `MERCADO_PAGO_ACCESS_TOKEN` (Live) e `WEBHOOK_SECRET` no painel de segredos.

## 7. Monitoramento & Alertas
- **Dashboard**: Disponível em `/admin/dashboard` para acompanhamento de vendas e webhooks.
- **Logs**: Tabela `payment_webhook_logs` monitorando todas as chegadas e rejeições.

## 8. Critérios de Rollback
- Em caso de falha no Fulfillment real, o status da transação permanece 'pendente' ou 'erro', e a licença não é gerada, permitindo intervenção manual do Ultra Admin sem gerar chaves órfãs.

---
**Classificação Final**: 🟡 AGUARDANDO CREDENCIAIS LIVE
