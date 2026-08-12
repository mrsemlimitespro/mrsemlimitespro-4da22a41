# INVENTÁRIO REAL DO AMBIENTE LEGADO

**STATUS:** 🟡 FASE 5 AGUARDANDO CONEXÃO COM O SUPABASE LEGADO

Este arquivo substituirá o `INVENTARIO_LEGADO_MOCK.md` assim que a conexão com o Supabase antigo for estabelecida.

## 1. Verificação de Acesso
- **LEGACY_SUPABASE:** NÃO CONECTADO
- **LEGACY_DATABASE:** INACESSÍVEL
- **LEGACY_STORAGE:** INACESSÍVEL

## 2. Ações Necessárias
Conforme verificado em `secrets--fetch_secrets`, as credenciais **não estão presentes** no ambiente de execução. Para prosseguir com a Fase 5.1, você deve configurar:

1. `LEGACY_SUPABASE_URL`: A URL do projeto legado.
2. `LEGACY_SUPABASE_SERVICE_ROLE_KEY`: A Service Role Key do projeto legado.

Utilize o botão de "Add Secret" ou adicione via Configurações do Projeto no Lovable.
