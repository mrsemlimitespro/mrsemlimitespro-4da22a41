# Extension License SDK — MR Sem Limites

SDK reutilizável extraído (sem alterações) da extensão **MR Sem Limites 2.2.7**.

Este pacote **não modifica** a extensão publicada. Ele apenas isola, documenta
e empacota toda a lógica de licenciamento (chave de teste, chave definitiva,
validação, expiração, renovação, bloqueio, comunicação com painel/API,
controle de sessão e tratamento de erros) para que possa ser reutilizada em
qualquer outra extensão Chrome MV3.

## Conteúdo

```
extension-sdk/
├── README.md                        ← este arquivo
├── EXTENSION_LICENSE_SDK.md         ← documentação completa da arquitetura
├── MIGRAR_EXTENSAO_CHECKLIST.md     ← checklist passo-a-passo de migração
├── GUIA_INTEGRACAO_EXTENSAO.md      ← guia para plugar em extensão nova
├── BUILD_PRODUCAO.md                ← como gerar builds protegidas
├── license.config.example.ts        ← configuração central (template)
└── src/
    ├── index.ts                     ← ExtensionLicenseSDK (fachada pública)
    ├── constants.ts                 ← constantes/tempos/URLs derivadas do config
    ├── storage.ts                   ← wrapper chrome.storage.local
    ├── license.ts                   ← validação, cache, mapeamento de erros
    └── types.ts                     ← tipos TypeScript
```

## Uso mínimo

```ts
import { createLicenseSDK } from "extension-sdk/src";
import { licenseConfig } from "./license.config";

const sdk = createLicenseSDK(licenseConfig);

// Ativar uma chave (teste ou definitiva)
await sdk.activate("MR-XXXX-XXXX", "cliente@email.com");

// Consultar estado atual (usa cache, revalida se expirado)
const state = await sdk.getState();
if (state.status === "valid") { /* liberar features */ }

// Forçar revalidação
await sdk.refresh();

// Deslogar / limpar
await sdk.clear();
```

## Compatibilidade

- 100% compatível com a extensão MR Sem Limites atual — mesma API, mesmos
  endpoints (`/api/public/ext/functions/v1/inject-config`), mesmo shape de
  `chrome.storage.local.settings`.
- Nada da extensão em produção foi alterado.
