# Plano de Migração e Configuração - MR Sem Limites (Fase 2)

Este plano detalha as ações para finalizar a migração do projeto MR Sem Limites para o novo ambiente, garantindo o acesso administrativo e a funcionalidade total da extensão.

## 1. Configuração de Acesso Administrativo
- Atribuir a role `admin` ao usuário `mariocftv@gmail.com` na tabela `user_roles`.
- Verificar a sincronização entre o Supabase Auth e a tabela de roles.
- Testar o acesso ao painel `/admin` e o bypass do password gate se necessário.

## 2. Ajustes de Marca e Identidade Visual
- Atualizar `src/components/brand.tsx` para usar o novo bucket de storage do Supabase.
- Fazer upload da logo e favicon oficiais para o bucket `admin-media` (ou bucket configurado).
- Ajustar os tokens de cor Magenta, Blue e Orange conforme definido na identidade visual.

## 3. Validação da API da Extensão
- Testar os endpoints de validação de licença (`validate-license-v2`) e heartbeat.
- Confirmar que o `EXT_SESSION_SECRET` está configurado corretamente no ambiente para assinatura de tokens.
- Verificar a remoção de restrições de tamanho de anexos no proxy de comandos.

## 4. Estruturação para MR Central (Multi-Produto)
- Revisar a tabela `produtos` e garantir que o `product_id` seja usado consistentemente em licenças.
- Preparar o sistema para suportar MR-SL e futuros produtos (MR-ZAP, MR-REMOTE).

## Detalhes Técnicos
- **Database:** Uso de migrations SQL via tool `supabase--migration`.
- **Backend:** TanStack Start Server Functions para lógica protegida.
- **Segurança:** RLS ativado em todas as tabelas com políticas `has_role`.
- **Storage:** Buckets públicos para assets e privados para releases da extensão.

Aguardando aprovação da Auditoria e deste plano para iniciar a execução.
