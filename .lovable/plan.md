# Plano de Homologação E2E - MR CENTRAL (Fase 3)

Este plano descreve a execução da auditoria e testes de ponta a ponta do ecossistema MR CENTRAL para garantir prontidão para produção.

## 1. Validação do Painel Administrativo
- Testar login do Ultra Admin (mariocftv@gmail.com).
- Verificar visibilidade de módulos no sidebar.
- Confirmar que o acesso é regido por RLS e roles do banco, não hardcode.

## 2. Ciclo Multi-Produto
- Criar dados de teste: Produto "MR-SL-TESTE", Versão "1.0.0-test", Cliente "Cliente Homologação MR".
- Validar fluxo: Gerar licença -> Vincular HWID -> Validar via API.
- Testar estados da licença: Ativa, Bloqueada, Revogada, Expirada.

## 3. Teste da API da Extensão
- Validar endpoints `/api/public/ext/functions.v1.validate-license-v2` e `/api/public/licenca/heartbeat`.
- Testar cenários: Licença válida, inexistente, expirada, bloqueada, limite de dispositivos excedido.

## 4. Segurança e RLS
- Testes negativos: Tentar acessar rotas/dados administrativos com usuário comum e anônimo.
- Validar proteção no nível do Supabase.

## 5. Webhooks e Storage
- Simular webhooks de pagamento (Kiwify/Cakto/MP) em modo sandbox.
- Verificar buckets de storage e acessibilidade de assets críticos (logos, capas).

## 6. Documentação de Evidências
- Gerar `HOMOLOGACAO_E2E_MR_CENTRAL.md` com matriz de testes e classificação final.
