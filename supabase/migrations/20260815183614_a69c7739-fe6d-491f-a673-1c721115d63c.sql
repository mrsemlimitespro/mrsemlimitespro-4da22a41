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

-- Função auxiliar Security Definer para evitar recursão
CREATE OR REPLACE FUNCTION public.get_user_workspaces(user_uuid uuid)
RETURNS TABLE(workspace_id uuid) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public AS $$
    SELECT wm.workspace_id 
    FROM public.workspace_members wm 
    WHERE wm.user_id = user_uuid AND wm.status = 'active';
$$;

-- Políticas para Workspaces
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT TO authenticated
USING (id IN (SELECT get_user_workspaces(auth.uid())));

CREATE POLICY "Users can insert workspaces"
ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their workspaces"
ON public.workspaces FOR UPDATE TO authenticated
USING (auth.uid() = owner_id);

-- Políticas para Workspace Members
CREATE POLICY "Members can view other members in same workspace"
ON public.workspace_members FOR SELECT TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- 6. Tabela Operacional Isolada
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