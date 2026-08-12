# AUDITORIA DE MIGRAÇÃO DE CONTEÚDO — MR SEM LIMITES

## 1. STATUS DA CONEXÃO
CURRENT_PROJECT_DATABASE: ACESSÍVEL
CURRENT_PROJECT_STORAGE: ACESSÍVEL

## 2. CONTAGEM DE ENTIDADES
| Entidade | Quantidade |
| --- | --- |
| Prompts | 0 |
| Agentes | 0 |
| Produtos/Extensões | 1 |
| Licenças | 0 |
| Dispositivos | 0 |
| Revendedores | 0 |
| Clientes | 2 |

## 3. RELACIONAMENTOS ENCONTRADOS
- Agentes possuem campos de instrução integrados.
- Prompts estão vinculados a categorias se houver dados em ai_categories.

## 4. SISTEMA DE LICENCIAMENTO ATUAL
- Tabelas: licencas, licenca_dispositivos, licencas_eventos.
- HWID vinculado via licenca_dispositivos.

## 5. RECOMENDAÇÕES PARA MR CENTRAL
- Unificar validação em API V2.
- Implementar expiração JWT para sessões de licença.
- Rotação de chaves e proteção contra replay.
