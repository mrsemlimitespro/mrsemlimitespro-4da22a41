# Homologação Backend MR Central (Extensão)

Implementação concluída e validada localmente.

## Rotas Implementadas (Public)
- `POST /api/ext/validate-license`
- `POST /api/ext/heartbeat`
- `POST /api/ext/send-command`
- `POST /api/ext/fix-stream`
- `POST /api/ext/upload`

## Banco de Dados
- Migration aplicada com sucesso.
- Tabelas criadas: `ext_sessions`, `ext_requests`, `ext_uploads`.
- Campos adicionados a `licencas`: `license_key`, `user_name`, `expires_at`, `max_devices`, `revoked_at`.

## Auditoria Sanitizada
- O helper `auditExtRequest` remove campos sensíveis antes de gravar no banco.
- Proxy `send-command` preserva `lastPayload` integralmente.

## Status de Homologação
Acesse `https://mrsemlimites.lovable.app/api/ext/test-backend` para rodar os testes automatizados.
