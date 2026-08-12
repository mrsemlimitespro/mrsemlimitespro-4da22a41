# INVENTÁRIO REAL DO AMBIENTE LEGADO

**STATUS:** 🟡 AGUARDANDO CONEXÃO

Este arquivo substituirá o `INVENTARIO_LEGADO_MOCK.md` assim que a conexão com o Supabase antigo (`dbyoofojkakaigdemoyp`) for estabelecida.

## 1. Verificação de Acesso
- **LEGACY_SUPABASE:** NÃO CONECTADO
- **LEGACY_DATABASE:** INACESSÍVEL
- **LEGACY_STORAGE:** INACESSÍVEL

## 2. Ações Necessárias
Para que eu possa realizar a reconciliação real, você precisa configurar as seguintes Secrets no Lovable (Settings > Secrets):

1. `LEGACY_SUPABASE_URL`: A URL do projeto antigo (ex: https://dbyoofojkakaigdemoyp.supabase.co)
2. `LEGACY_SUPABASE_SERVICE_ROLE_KEY`: A Service Role Key (secret) do projeto antigo para permitir consultas administrativas READ-ONLY.

**Nota:** O arquivo MOCK atual contém estimativas (~250 clientes, ~300 licenças) que não podem ser validadas sem esta conexão.
