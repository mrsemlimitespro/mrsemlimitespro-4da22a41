# Revisão MR Central V17 para integração de extensão

## Alterações aplicadas

Esta revisão preserva o painel, as migrations, as regras de licença/HWID, as rotas de comando, o upload e o proxy existentes. Foram alterados apenas os componentes de integração abaixo.

| Área | Alteração |
|---|---|
| CORS | `getCorsHeaders` agora permite apenas a origem configurada por `MR_EXTENSION_ORIGIN` em produção. O localhost permanece limitado ao desenvolvimento. |
| Licença e heartbeat | As respostas mantêm os campos V17 e acrescentam `status: "valid"`, `license_status`, `type`, `customer_name` e `session_token` para compatibilidade de sessão. |
| Upload | O adaptador passou a ser um script clássico que expõe `globalThis.UploadManager`, preservando `uploadFile(file, options, onProgress)` e os métodos auxiliares. |
| Testes | Foi adicionado o comando `pnpm test` e um teste do handler real de validação, além dos testes de CORS e contrato. |

## Testes executados nesta revisão

```text
pnpm exec tsc --noEmit  → aprovado
pnpm test               → 4 arquivos e 11 testes aprovados
pnpm build              → aprovado antes da inclusão do teste adicional
```

## Configuração obrigatória antes de publicar

Após empacotar a extensão com a chave pública de distribuição, defina no ambiente de produção uma única variável:

```text
MR_EXTENSION_ORIGIN=chrome-extension://<ID_ESTAVEL_DA_EXTENSAO>
```

Não inclua `.env`, chaves privadas, tokens ou credenciais no GitHub. O valor deve ser configurado na área de variáveis/segredos da plataforma de publicação.

## Verificação após a publicação

```bash
curl -i -X OPTIONS 'https://mrsemlimitespro.lovable.app/api/public/ext/validate-license' \
  -H 'Origin: chrome-extension://<ID_ESTAVEL_DA_EXTENSAO>' \
  -H 'Access-Control-Request-Method: POST'
```

A resposta deve ter HTTP `204` e o cabeçalho `Access-Control-Allow-Origin` deve ser exatamente igual à origem configurada.
