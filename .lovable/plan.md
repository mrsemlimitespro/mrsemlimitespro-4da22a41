# Plano: ITEM 2 — Dashboard Visual MR Sem Limite Pro

Implementação da camada visual do dashboard seguindo a identidade oficial: tema escuro predominante, azul neon para navegação/ação e verde neon para estados positivos.

## Objetivos Visuais
- **Tema**: Preto predominante com superfícies glassmorphism.
- **Cores**: Azul Neon (#3b82f6) como cor primária; Verde Neon para sucessos; Vermelho/Magenta Neon para alertas.
- **Navegação**: Sidebar responsivo e recolhível com estrutura preparada (Dashboard, WhatsApp, etc.).
- **Estados**: Implementação de estados vazios ("Ainda não há dados") e carregamento.

## Alterações Propostas

### 1. Estilização Global (`src/styles.css`)
- Ajustar tokens de cores para priorizar o Azul Neon no `--primary` e Verde Neon no `--brand-emerald`.
- Refinar utilitários `glass` e `card-premium` para o novo contraste.

### 2. Layout e Navegação (`src/components/app-sidebar.tsx`, `src/routes/_app.tsx`)
- Reorganizar o sidebar para incluir os grupos solicitados:
    - Dashboard
    - Empresas
    - WhatsApp, Contatos, Grupos, Campanhas
    - Filas, Logs, Webhooks
    - Integrações, Configurações
- Implementar lógica de recolhimento (collapsible) se necessário ou refinar o rail atual.

### 3. Dashboard Central (`src/routes/_app.dashboard.tsx`)
- Atualizar o layout para refletir a nova hierarquia visual.
- Substituir placeholders por estados "Ainda não há dados" onde a lógica ainda não foi implementada.
- Aplicar o branding neon de forma equilibrada (sem excessos).

### 4. Componentes de Apoio (`src/components/brand.tsx`, `src/components/top-bar.tsx`)
- Garantir que o `BrandMark` e `BrandLogo` usem as proporções corretas.
- Ajustar o `PanelChip` para as novas cores de perfil.

## Aspectos Técnicos
- **Sem alteração de lógica**: Nenhuma migration SQL, RLS ou integração server-side será modificada.
- **Preservação**: Todas as rotas existentes serão mantidas funcionais.
- **Responsividade**: Suporte completo a Mobile (Bottom Nav) e Desktop (Sidebar).

## Lista de Telas Visuais Disponíveis (Após Item 2)
1. Dashboard Principal (Visão Geral)
2. Estrutura de Menus Lateral (WhatsApp, Campanhas, etc. - Cascas Visuais)
3. Top Bar com Busca e Notificações
4. Navegação Mobile Unificada
