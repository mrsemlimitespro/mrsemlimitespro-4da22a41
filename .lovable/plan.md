# Plano de Implementação: Nova Identidade Visual MR Sem Limites

Implementar a nova logo premium em todos os locais estratégicos do sistema, seguindo as diretrizes de integração visual, transparência e destaque.

## Alterações Visuais

### Logo e Identidade
- **Substituição da Logo**: Trocar o link da logo no componente `src/components/brand.tsx` pelo novo asset CDN.
- **Destaque na Login**: Aumentar a escala da logo na tela de login (`src/routes/login.tsx`) para ser o elemento mais visível.
- **Integração no Dashboard**: Atualizar a logo central do dashboard (`src/routes/_app.dashboard.tsx`) garantindo o efeito de glow e transparência solicitado.
- **Sidebar e Cabeçalhos**: Garantir que o `BrandMark` em `src/components/app-sidebar.tsx`, `src/components/top-bar.tsx` e `src/routes/admin.tsx` utilize a nova logo com proporções adequadas.

### Ajustes Técnicos
- **Asset CDN**: Utilizar o `mr-sem-limites-logo.png.asset.json` recém-criado.
- **Remoção de Bordas**: Garantir que as imagens da logo não tenham fundos sólidos ou bordas visíveis, utilizando `object-contain` onde necessário para preservar a forma original.
- **Consistência**: Verificar e atualizar metadados de SEO no `src/routes/__root.tsx` e rotas folha.

## Technical Details
- File `src/assets/mr-sem-limites-logo.png.asset.json` will be the source for `BRAND_LOGO_URL`.
- CSS variables for neon gradients will be preserved as they match the new logo's aesthetics (Magenta/Blue).
- `BrandMark` component already handles glow/halo effects, which align with the "neon suave" requirement.
