
ALTER TABLE public.ai_prompts ADD COLUMN IF NOT EXISTS legacy_id text;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS legacy_id text;
ALTER TABLE public.ai_prompts ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ai_prompts TO authenticated, anon;
GRANT SELECT ON public.ai_agents TO authenticated, anon;
GRANT ALL ON public.ai_prompts TO service_role;
GRANT ALL ON public.ai_agents TO service_role;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_prompts' AND policyname = 'Allow public read access') THEN
        CREATE POLICY "Allow public read access" ON public.ai_prompts FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_agents' AND policyname = 'Allow public read access') THEN
        CREATE POLICY "Allow public read access" ON public.ai_agents FOR SELECT USING (true);
    END IF;
END $$;
