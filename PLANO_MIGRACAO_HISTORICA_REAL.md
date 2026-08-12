# PLANO DE MIGRAÇÃO HISTÓRICA REAL

**STATUS:** 🟡 AGUARDANDO DADOS REAIS

Este plano será detalhado assim que o Inventário Real for concluído.

## Estratégia Prevista
1. **Mapeamento:** `legacy_table` -> `central_table`
2. **Deduplicação:** Baseada em `email` (normalizado) e `hwid`.
3. **Integridade:** Preservação de chaves de licença e datas de expiração.
4. **Lotes:** Migração em lotes de 50 registros para monitoramento.
