# Plano de Migração e Configuração - MR Sem Limites

Migração integral do sistema para o novo ambiente com backend Supabase e TanStack Start.

## Tarefas Principais

### 1. Reconstrução do Sistema (Frontend)
- [x] Extração e análise do código-fonte original.
- [x] Migração dos arquivos de `src/` para a estrutura TanStack Start.
- [x] Configuração da rota principal (`/`) substituindo o placeholder original.
- [ ] Verificação e ajuste de todas as rotas importadas (Admin, Dashboard, Agentes, etc.).
- [ ] Aplicação consistente da identidade visual em novos componentes.

### 2. Integração com Supabase
- [ ] Configuração do cliente Supabase para apontar para o novo projeto.
- [ ] Execução das migrações de banco de dados (tabelas, funções, RLS).
- [ ] Verificação do sistema de autenticação e fluxos de sessão.
- [ ] Validação das tabelas críticas: `clientes`, `licencas`, `produtos`, `user_roles`.

### 3. API da Extensão de Navegador
- [ ] Implementação/Ajuste dos endpoints em `src/routes/api/public/ext/`.
- [ ] Configuração do proxy de comandos e validação de licença.
- [ ] Remoção de restrições de tamanho de anexos nos handlers.

### 4. Painel Administrativo (/admin)
- [ ] Garantir que o `admin-password-gate` e permissões RLS estejam operacionais.
- [ ] Testar módulos de Gestão, Configurações e Auditoria.

## Detalhes Técnicos
- **Stack**: TanStack Start v1, React 19, Tailwind CSS v4, Supabase.
- **Banco de Dados**: Aplicação de 50+ migrations encontradas no backup.
- **Segurança**: RLS obrigatório em todas as tabelas públicas; função `has_role` para controle de acesso admin.
- **Arquivos**: Uso de `lovable-assets` para gerenciamento de mídia e anexos da extensão.
