# Plano de Transformação Estrutural: MR Sem Limite Pro

Este plano detalha a remoção completa de legados e a implementação da interface exclusiva de **Dispatch Multicanal**.

## 1. Purga de Módulos e Rotas Legadas
Removeremos todos os arquivos de rotas que não pertencem ao ecossistema de dispatch/WhatsApp:
*   **Rotas de IA/Packs:** `_app.agents.tsx`, `_app.prompts.tsx`, `_app.packs.tsx`, `_app.packs.$slug.tsx`, `_app.loja.tsx`, `admin.loja.tsx`, `admin.loja-produtos.tsx`.
*   **Rotas de Revenda Legada:** `_app.quero-ser-revendedor.tsx`, `_app.revendedor.tsx`, `admin.revendedores-gestao.tsx`.
*   **Conteúdo de Treinamento/Aulas:** `_app.aulas.tsx`.
*   **Componentes:** Limpeza em `src/components/home/` e remoção de carrosséis de produtos/propagandas genéricas.

## 2. Nova Identidade Visual (Deep Dark Neon)
Refinamento total do `src/styles.css` para eliminar tons de magenta/rosa residuais:
*   **Paleta:** Fundo em `#050308` (Preto profundo), Ação em `#3b82f6` (Azul Neon), Estados em `#10b981` (Verde Neon).
*   **UI/UX:** Glassmorphism de alto contraste, eliminando o efeito "sunset" avermelhado por um brilho azulado discreto.

## 3. Estrutura de Navegação (Dispatch Real)
O `AppSidebar` será reconstruído para refletir as abas solicitadas, eliminando a hierarquia de "Revenda":
*   **Dashboard:** Visão geral de métricas de envio e status de instâncias.
*   **Workspaces:** Gestão de empresas e isolamento de membros.
*   **WhatsApp:** Painel de instâncias Evolution API (Conectar, QR Code, Status).
*   **Contatos/Grupos:** Gestão de leads e listas para disparo.
*   **Campanhas/Filas:** Agendamento e monitoramento de envios.
*   **Logs/Webhooks:** Rastreamento técnico e integração externa.

## 4. Landing Page e Dashboard
*   **Index (Público):** Transformação em uma landing page profissional para o SaaS MR Sem Limite Pro, focada em automação multicanal.
*   **Dashboard (Privado):** KPI cards reais: Total de Envios, Instâncias Ativas, Taxa de Sucesso, Leads Engajados.

## 5. Próximos Passos (Após Autorização)
1.  Execução do `rm` nas rotas identificadas.
2.  Atualização dos tokens de cor no `src/styles.css`.
3.  Reescrita do `src/components/app-sidebar.tsx`.
4.  Substituição do conteúdo de `src/routes/index.tsx` e `src/routes/_app.dashboard.tsx`.

---
**Aguardando autorização explícita para aplicar as alterações destrutivas e a nova interface.**
