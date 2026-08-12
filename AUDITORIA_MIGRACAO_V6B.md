# AUDITORIA DE MIGRAÇÃO FASE 6B — MR SEM LIMITES

## 1. OBJETIVO
Migrar os 16 prompts reais e investigar agentes definitivos.

## 2. STATUS ATUAL
- **Prompts Encontrados**: 0 reais (apenas 2 mocks da Fase 6A ativos).
- **Agentes Encontrados**: 0 reais.
- **Investigação**:
    - Consultas ao banco de dados (`ai_prompts`, `ai_agents`) retornaram zero registros reais.
    - Arquivos JSON (`EXPORT_PROMPTS_MRSL.json`) contêm apenas mocks.
    - Migrações (`20260707065236_...`) referenciam 14 UUIDs para `cover_url`, mas não contêm os `INSERT` statements correspondentes.
    - Busca por strings como "VSL", "Copywriter", "Headline" em todo o código fonte não revelou os prompts reais.

## 3. IMPEDIMENTOS
Os dados reais dos 16 prompts não estão presentes no ambiente sandbox atual. É provável que eles estivessem no banco de dados "legado" que não está mais acessível ou não foi exportado corretamente.

## 4. PRÓXIMOS PASSOS
- [ ] Usuário deve fornecer o arquivo JSON/SQL com os 16 prompts reais.
- [ ] Assim que os dados forem fornecidos, o motor de migração será reativado.
- [ ] Limpeza dos mocks (numero 998, 999).

---
**STATUS: 🟡 AGUARDANDO DADOS REAIS**
