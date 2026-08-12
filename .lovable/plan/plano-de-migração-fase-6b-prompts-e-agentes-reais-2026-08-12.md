# Plano de Migração Fase 6B: Prompts e Agentes Reais

## Objetivo
Substituir os dados mock da Fase 6A pelos 16 prompts reais mencionados pelo usuário e realizar a investigação final dos agentes.

## Status da Investigação
- **Banco de Dados Conectado**: Retornou 0 registros para `ai_prompts` e `ai_agents`.
- **Arquivos JSON**: `EXPORT_PROMPTS_MRSL.json` contém apenas os 2 mocks de teste.
- **Migrações**: Identificadas referências a 14 UUIDs de prompts em `UPDATE` statements para `cover_url`, confirmando que os registros existiram no passado, mas não estão no dump atual.
- **Assets**: Arquivos `.zip` inspecionados não contêm o conteúdo textual dos prompts.

## Ações
1. **Recuperação de Dados**: Solicitar ao usuário o arquivo JSON ou SQL contendo os 16 prompts reais, caso não estejam no ambiente.
2. **Motor de Migração**: Reativar o endpoint `/api/public/setup-migration-v6a` para processar os dados reais assim que disponíveis.
3. **Limpeza**: Remover os registros mock (`numero` 998 e 999) antes do go-live.
4. **Mapeamento**: Garantir que os IDs reais coincidam com os UUIDs das capas (`prompt-1.jpg`, etc.).

## Auditoria Final
Gerar `AUDITORIA_MIGRACAO_V6B.md` com a contagem real após o processamento.
