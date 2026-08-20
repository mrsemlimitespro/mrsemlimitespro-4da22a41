# Auditoria e Melhoria do Painel MR CENTRAL

## Problemas Identificados
- **Download V17:** O usuário relata que o download não começa e abas parecem "fakes".
- **Sincronização:** Falta de harmonia entre módulos de admin e cliente.
- **Auditoria Geral:** Necessidade de verificar todas as rotas de licenciamento e revenda para garantir funcionalidade total sem quebras.
- **Identidade Visual:** Consolidação do estilo Neon Premium MR Sem Limites.

## Plano de Ação

### 1. Auditoria e Correção de Downloads
- **Arquivo:** `src/routes/api/public/download-v17.ts`
- **Ação:** Verificar o cabeçalho `Content-Disposition` para garantir que o navegador trate como download e não tente abrir o arquivo. Validar se o asset `mr-central-v17-complete-final.zip` está acessível no bucket.
- **Reforço:** Adicionar logs de erro no handler caso o redirecionamento falhe.

### 2. Sincronização de Menus e Abas
- **Sidebars e Navs:** Revisar `AppSidebar` e `MobileBottomNav` para garantir que as rotas configuradas nos módulos (`system_modules`) batam com as abas exibidas.
- **Fase de Revenda:** Garantir que o Revendedor veja apenas o que lhe é permitido, removendo itens que dão 404.

### 3. Melhoria na Gestão de Licenças
- **Funcionalidade:** Verificar o RPC `gerar_licenca_estoque` e `vincular_licenca_cliente`.
- **UI:** Melhorar o feedback visual de "Copiado" e "Aguardando ativação".

### 4. Consolidação Visual (Neon Premium)
- **Marca:** Ajustar `BrandMark` e `WatermarkFooter` para usar as cores canônicas do sistema.
- **Dashboard:** Garantir que todos os KPI cards usem o sistema de tiles coloridos do design system.

## Detalhes Técnicos
- Utilização de `supabaseAdmin` para operações críticas de proxy.
- RLS em `system_modules` para garantir visibilidade dinâmica.
- Redirecionamento 307 ou 302 em rotas de download com headers de anexo.
