# Plano: Aba de Troca de Senha no Painel Admin

Implementar uma aba dedicada à alteração de senha dentro do painel administrativo, atendendo ao pedido do usuário de não resetar a senha atual, mas permitir a troca voluntária através de uma interface segura.

## Alterações

### Frontend

- **Novo Componente**: Criar `src/components/admin/change-password-tab.tsx` com o formulário de alteração de senha (senha atual, nova senha, confirmação).
- **Nova Rota**: Criar `src/routes/admin.perfil.tsx` (ou ajustar o sidebar para incluir a aba em Configurações) para hospedar a interface de troca de senha.
- **Sidebar**: Adicionar o link "Meu Perfil / Segurança" no sidebar do Ultra Admin em `src/routes/admin.tsx`.

### Backend

- **Server Function**: Criar `src/lib/admin/auth.functions.ts` com a função `changeAdminPassword` que valida a sessão e atualiza a senha via `supabase.auth.updateUser`.

## Detalhes Técnicos

- Utilização de `createServerFn` para garantir que a lógica de autenticação seja tratada corretamente.
- Integração com `sonner` para feedback visual de sucesso ou erro.
- Preservação da senha atual conforme solicitado pelo usuário.

---
**Nota**: O acesso do administrador `rogeriocftv.mr@gmail.com` será mantido com a senha definida anteriormente (`NovaSenha123!`), e esta nova aba permitirá que ele a altere quando desejar.
