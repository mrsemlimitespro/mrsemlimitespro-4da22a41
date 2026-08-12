# MIGRAR_EXTENSAO_CHECKLIST

Passo-a-passo para levar o sistema de licenças MR Sem Limites para outra extensão
Chrome MV3 **sem tocar** no que já funciona hoje.

## 1. Copiar arquivos

Da pasta `extension-sdk/` para a raiz da nova extensão:

- [ ] `extension-sdk/src/*` → `nova-extensao/lib/license-sdk/`
- [ ] `extension-sdk/license.config.example.ts` → `nova-extensao/license.config.ts`
- [ ] `extension-sdk/EXTENSION_LICENSE_SDK.md` (manter como referência)

## 2. Ajustar `license.config.ts`

- [ ] `extensionName`, `extensionId`, `version`, `productName`, `logoUrl`
- [ ] `apiBaseUrl` e `panelUrl` (se for painel próprio)
- [ ] `anonKey` (chave anon pública do painel)
- [ ] `trialMinutes`, `paidDays` (opcional — defaults iguais aos atuais)

## 3. `manifest.json` da nova extensão

- [ ] `"permissions"`: incluir pelo menos `"storage"`.
- [ ] `"host_permissions"`: adicionar `https://<seu-painel>/*`.
- [ ] `"background": { "service_worker": "background.js", "type": "module" }`.

## 4. Integrar no `background.js`

```js
import { createLicenseSDK } from "./lib/license-sdk/index.js";
import { licenseConfig } from "./license.config.js";

const sdk = createLicenseSDK(licenseConfig);

// Revalidação periódica
chrome.alarms.create("license-refresh", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "license-refresh") sdk.refresh();
});

// Handler de mensagens
chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.type === "license:activate") {
    sdk.activate(msg.key, msg.email).then(reply);
    return true;
  }
  if (msg?.type === "license:state") {
    sdk.getState().then(reply);
    return true;
  }
});
```

## 5. Integrar no `sidepanel.html` / `popup.html`

- [ ] Campo `<input id="license-key">` e botão "Ativar".
- [ ] `chrome.runtime.sendMessage({type:"license:activate", key, email})`.
- [ ] Ler `licenseState.status` para habilitar/desabilitar features.

## 6. Endpoints no painel

Se for reutilizar o painel MR Sem Limites, nada a fazer.
Se for criar painel novo, replicar as rotas listadas em `EXTENSION_LICENSE_SDK.md §6`.

## 7. Testar

- [ ] Chave inexistente → `status="invalid"`.
- [ ] Chave teste nova → `status="valid"`, `plan="trial"`.
- [ ] Aguardar `trialMinutes` → `status="expired"`.
- [ ] Chave premium → `status="valid"`, `plan="premium"`.
- [ ] Segundo dispositivo (acima do `max_dispositivos`) → `status="device_mismatch"`.
- [ ] Painel revoga → em até 60 s: `status="revoked"`.

## 8. Publicar

- [ ] `zip -r nova-extensao.zip .` (excluir `.git`, `node_modules`, `*.md` opcional).
- [ ] Chrome Web Store → Upload novo item.
- [ ] Ou distribuir como "unpacked" (dev).
