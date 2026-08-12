# GUIA_INTEGRACAO_EXTENSAO

Como pegar uma extensão MV3 **nova/em branco** e plugar o sistema de licenças
sem alterar nada da lógica dela.

## Cenário

Você tem uma extensão com features próprias (ex.: um automatizador de tarefas)
e quer proteger o acesso com o mesmo sistema de licenças do MR Sem Limites.

## Passo 1 — Adicionar o SDK

Copie a pasta `extension-sdk/src/` para a sua extensão como `lib/license-sdk/`:

```
minha-extensao/
├── manifest.json
├── background.js         ← já existe
├── lib/
│   └── license-sdk/      ← novo
│       ├── index.ts
│       ├── constants.ts
│       ├── license.ts
│       ├── storage.ts
│       └── types.ts
└── license.config.ts     ← novo (copie de license.config.example.ts)
```

Se sua extensão é JavaScript puro (sem build TS), transpile o SDK uma vez:

```bash
npx esbuild extension-sdk/src/index.ts --bundle --format=esm \
  --outfile=minha-extensao/lib/license-sdk/index.js --platform=browser
```

Ou mantenha `.ts` e faça build via `vite build --config ...`.

## Passo 2 — Envelope de gate

Crie um único arquivo `license-gate.js` na sua extensão. Nada mais precisa saber
que existe licença — o gate faz o trabalho:

```js
import { createLicenseSDK } from "./lib/license-sdk/index.js";
import { licenseConfig } from "./license.config.js";

const sdk = createLicenseSDK(licenseConfig);

export async function isUnlocked() {
  const state = await sdk.getState();
  return state.status === "valid";
}

export { sdk };
```

## Passo 3 — Envolver as features

Onde a extensão executa algo protegido:

```js
import { isUnlocked } from "./license-gate.js";

async function runFeature() {
  if (!(await isUnlocked())) {
    chrome.runtime.openOptionsPage(); // ou abre o sidepanel de ativação
    return;
  }
  // ... lógica original intacta
}
```

## Passo 4 — Tela de ativação

Você pode reutilizar o `sidepanel.html` da MR Sem Limites como referência.
O mínimo é: um input para a chave, um botão "Ativar" e um `<pre>` mostrando
`state.status` + `state.expiresAt`.

## Passo 5 — Nada mais

Sua lógica de negócio permanece inalterada. O SDK só decide **se** ela roda.
