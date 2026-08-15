# Plano de Implementação: ITEM 3 — WORKSPACES

Este plano detalha a execução da infraestrutura multiempresa para o **MR Sem Limite Pro**, garantindo isolamento total de dados e segurança via RLS no Supabase, mantendo a compatibilidade com o legado.

## Objetivos
1. Implementar o schema de `workspaces` e `workspace_members`.
2. Configurar RLS (Row Level Security) com funções `SECURITY DEFINER` para evitar recursão.
3. Criar lógica server-side idempotente para garantir que cada usuário tenha um workspace inicial.
4. Integrar o seletor de workspace no frontend.

## SQL de Implementação (Fase 0 - Aditivo)

```sql
-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text DEFAULT 'personal' CHECK (type IN ('personal', 'business')),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Tabela de Membros
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    joined_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(workspace_id, user_id)
);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
GRANT ALL ON public.workspace_members TO service_role;

-- 5. Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Função auxiliar Security Definer
CREATE OR REPLACE FUNCTION public.get_user_workspaces(user_uuid uuid)
RETURNS TABLE(workspace_id uuid) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public AS $$
    SELECT wm.workspace_id 
    FROM public.workspace_members wm 
    WHERE wm.user_id = user_uuid AND wm.status = 'active';
$$;

-- Políticas
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT TO authenticated
USING (id IN (SELECT get_user_workspaces(auth.uid())));

CREATE POLICY "Users can insert workspaces"
ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their workspaces"
ON public.workspaces FOR UPDATE TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Members can view other members in same workspace"
ON public.workspace_members FOR SELECT TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- 6. Tabela Operacional Isolada (Exemplo inicial)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    instance_key text UNIQUE,
    status text DEFAULT 'disconnected',
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_instances TO authenticated;
GRANT ALL ON public.whatsapp_instances TO service_role;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for instances"
ON public.whatsapp_instances FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));
```

## Alterações de Código

1. **`drizzle/schema.ts`**: Adicionar as novas tabelas para manter sincronia com a API tRPC.
2. **`server/routers/workspaces.ts`**: Criar novo router tRPC para gerenciamento de empresas.
3. **`src/lib/tenants.functions.ts`**: Implementar `ensureInitialWorkspace` (Server Function idempotente).
4. **`src/pages/Home.tsx`**: Adicionar o seletor de workspace e filtro de dados por empresa selecionada.

## Verificação de Segurança
- Testes RLS: Tentar acessar o `workspace_id` de outro usuário via tRPC.
- Isolamento: Garantir que a `evolutionRouter.list` filtre automaticamente por `workspace_id`.

**Aguardando autorização explícita para aplicar esta migration.**
