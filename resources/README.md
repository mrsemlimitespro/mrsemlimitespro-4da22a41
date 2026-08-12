# Resources — Ícone e Splash nativos

Coloque dois arquivos aqui antes de rodar `bun run native:assets`:

| Arquivo         | Tamanho    | Requisitos                                                              |
| --------------- | ---------- | ----------------------------------------------------------------------- |
| `icon.png`      | 1024×1024  | PNG quadrado, sem cantos arredondados, com **margem segura de ~10%**    |
| `splash.png`    | 2732×2732  | PNG quadrado, logo **centralizado** ocupando ~30%, fundo `#0a0a0f`      |

O gerador (`@capacitor/assets`) recorta automaticamente todas as densidades
Android (mdpi → xxxhdpi, adaptive icon foreground/background) e todos os
tamanhos iOS (AppIcon.appiconset + LaunchStoryboard).

Fundo padrão: `#0a0a0f` (definido em `scripts/native-assets.sh`).

Se quiser variantes escuras diferentes, adicione `icon-dark.png` e/ou
`splash-dark.png` seguindo os mesmos tamanhos.
