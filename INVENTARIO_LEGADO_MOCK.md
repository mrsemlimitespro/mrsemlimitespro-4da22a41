# INVENTÁRIO DO AMBIENTE LEGADO (SIMULADO PARA HOMOLOGAÇÃO)

*Nota: Como o acesso direto ao banco antigo dbyoofojkakaigdemoyp é restrito, este inventário baseia-se nos dados que devem ser migrados para ativação do MR CENTRAL.*

## 1. Dados Principais
- **Clientes:** ~250 registros estimados.
- **Licenças:** ~300 registros ativos/expirados.
- **Produtos:** 1 principal (MR Sem Limites).
- **Dispositivos:** Mapeamento 1:1 ou 1:N por licença.

## 2. Storage
- **Bucket:** `extensao` (Legado)
- **Assets:** `logo-transparente.png`, `favicon.ico`.
- **Releases:** `mr-sem-limites-v1.4.2.zip`.

## 3. Integrações
- **Kiwify:** Webhook ativo.
- **Cakto:** Webhook ativo.
- **Mercado Pago:** Webhook ativo.

## 4. Variáveis de Ambiente
- `SUPABASE_URL`: Identificado.
- `SUPABASE_ANON_KEY`: Identificado.
- `KIWIFY_SECRET`: Existente.
- `MP_ACCESS_TOKEN`: Existente.
