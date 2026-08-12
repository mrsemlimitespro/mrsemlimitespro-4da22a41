# ROLLBACK_MR_CENTRAL — PLANO DE EMERGÊNCIA

## 1. Identificação do Ambiente
- **Novo Ambiente (MR CENTRAL):** Lovable Project `219cca7e-5961-4a3d-8913-3023bcbe8103` / Supabase `nbehebyxnkpihbiathmx`.
- **Ambiente Legado (MR Sem Limites):** Supabase `dbyoofojkakaigdemoyp` (Externo).

## 2. Endpoints e Variáveis Críticas
- **API Extensão:** `/api/public/ext/*` e `/api/public/licenca/*`.
- **Webhooks:** `/api/public/webhooks/*` (Kiwify, Cakto, Mercado Pago).
- **Storage:** Buckets `extension-releases`, `admin-media`, `extensao`.

## 3. Critérios para Rollback Imediato
- Falha massiva na validação de licenças (> 5% de erro em 10 minutos).
- Extensão incapaz de realizar o heartbeat.
- Vazamento de dados via RLS (identificado por auditoria).
- Admin incapaz de gerenciar licenças ou usuários.
- Quebra de compatibilidade com HWID de usuários existentes.

## 4. Procedimento de Rollback
1. **Redirecionamento de DNS/API:** Alterar a URL base da extensão (se possível via remote config) de volta para o endpoint legado.
2. **Apontamento de Webhooks:** Reverter a URL de notificação nas plataformas de pagamento para o servidor antigo.
3. **Sincronização de Dados (Pós-Rollback):**
   - Exportar novos clientes e licenças criados no MR CENTRAL durante a janela de migração.
   - Importar manualmente no banco legado para garantir que vendas realizadas no novo ambiente não sejam perdidas.
4. **Desativação do Frontend:** Alterar o `src/routes/index.tsx` do projeto Lovable para um estado de manutenção ou redirecionamento.

## 5. Contatos de Emergência
- Administrador: mariocftv@gmail.com
