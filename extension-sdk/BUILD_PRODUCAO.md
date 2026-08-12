# BUILD_PRODUCAO

Como gerar builds de produção do SDK e/ou da extensão que o consome.

## Objetivos

- Minificação
- Tree Shaking
- Dead Code Elimination
- Sourcemaps desativados em produção
- Configuração separada do código
- Variáveis sensíveis fora do bundle
- Estrutura pronta para ofuscação opcional

## Setup base (esbuild)

`package.json`:

```json
{
  "scripts": {
    "build:sdk": "esbuild extension-sdk/src/index.ts --bundle --format=esm --minify --tree-shaking=true --legal-comments=none --sourcemap=false --outfile=dist/license-sdk.js --platform=browser",
    "build:ext": "node scripts/build-extension.mjs"
  }
}
```

Flags relevantes:

| Flag | Efeito |
|---|---|
| `--minify` | Minificação |
| `--tree-shaking=true` | Remove imports não utilizados |
| `--legal-comments=none` | Remove comentários (inclui licença) |
| `--sourcemap=false` | Sem sourcemap em produção |
| `--drop:console --drop:debugger` | Remove logs em produção |

## Build da extensão completa

`scripts/build-extension.mjs`:

```js
import { build } from "esbuild";
import { cpSync, rmSync, mkdirSync } from "node:fs";

const OUT = "dist/extension";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1. Copia arquivos estáticos
for (const f of ["manifest.json", "sidepanel.html", "popup.html", "icons"]) {
  cpSync(f, `${OUT}/${f}`, { recursive: true });
}

// 2. Bundle background + content scripts
await build({
  entryPoints: {
    background: "background.js",
    "content/content": "content/content.js",
    sidepanel: "sidepanel.js",
    popup: "popup.js",
  },
  bundle: true,
  format: "esm",
  minify: true,
  treeShaking: true,
  legalComments: "none",
  drop: ["console", "debugger"],
  outdir: OUT,
  platform: "browser",
  target: ["chrome110"],
});

console.log("Build OK →", OUT);
```

## Ofuscação (opcional)

Depois da build, aplicar `javascript-obfuscator` apenas em `background.js`
e `lib/*` — nunca em arquivos que o Chrome Web Store audita como grandes
(pode ser rejeitado se muito agressivo):

```bash
npx javascript-obfuscator dist/extension/background.js \
  --output dist/extension/background.js \
  --compact true --self-defending true \
  --string-array true --string-array-threshold 0.75 \
  --disable-console-output true
```

## Segredos

- `anonKey` fica em `license.config.ts` — é público por design.
- Qualquer chave privada deve morar no backend (painel), **nunca** no ZIP.
- Se precisar de valores por ambiente, usar `define`:

```bash
esbuild ... --define:process.env.PANEL_URL='"https://painel.exemplo.com"'
```

## Empacotamento final

```bash
cd dist/extension
zip -r ../minha-extensao.zip .
```

Publicar em `chrome://extensions` (modo desenvolvedor) ou na Chrome Web Store.

## Checklist antes de publicar

- [ ] Build sem warnings
- [ ] `manifest.json` com `version` incrementada
- [ ] Sourcemaps ausentes em `dist/`
- [ ] `console.log` removidos (`--drop:console`)
- [ ] Testado em Chrome limpo (novo perfil)
- [ ] Ativação de chave teste + premium OK
- [ ] Expiração + revogação verificadas
