# MAPA DE MIGRAÇÃO — MR CENTRAL

## 1. Mapeamento de Entidades

| Entidade Antiga | Tabela Destino | Estratégia | Risco | Status |
| :--- | :--- | :--- | :--- | :--- |
| Clientes | `clientes` | Migração por e-mail (deduplicação) | Médio (duplicidade) | Pendente |
| Licenças | `licencas` | Migração por chave (preservar HWID/validade) | CRÍTICO | Pendente |
| Produtos | `produtos` | Mapeamento manual para `produto_id` | Baixo | Validado |
| Dispositivos | `licenca_dispositivos` | Migração associada à licença | Alto | Pendente |
| Arquivos Extensão | Storage: `extension-releases` | Upload manual dos binários oficiais | Médio | Pendente |
| Assets (Logo/Brand) | Storage: `admin-media` | Migração de assets premium | Baixo | Concluído |

## 2. Estratégia de Deduplicação (Clientes)
- Identificador primário: `email`.
- Caso o e-mail já exista no destino, atualizar apenas metadados necessários e associar novas licenças.
- Não sobrescrever `created_at` original.

## 3. Estratégia de Integridade (Licenças)
- Relacionar cada licença ao `produto_id` do "MR Sem Limites" (SLUG: `mr-sem-limites`).
- Manter `status`, `key`, `expires_at` e `device_limit` idênticos.
