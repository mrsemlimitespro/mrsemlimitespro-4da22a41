
-- device_push_tokens: tokens FCM/APNs registrados por dispositivo/usuário
CREATE TABLE public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('android','ios','web')),
  device_id text,
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX device_push_tokens_user_idx ON public.device_push_tokens(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tokens - select"
  ON public.device_push_tokens FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own tokens - insert"
  ON public.device_push_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own tokens - update"
  ON public.device_push_tokens FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own tokens - delete"
  ON public.device_push_tokens FOR DELETE
  TO authenticated USING (auth.uid() = user_id);


-- push_preferences: 1 linha por usuário
CREATE TABLE public.push_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  sound boolean NOT NULL DEFAULT true,
  vibration boolean NOT NULL DEFAULT true,
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_preferences TO authenticated;
GRANT ALL ON public.push_preferences TO service_role;

ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prefs - select"
  ON public.push_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own prefs - insert"
  ON public.push_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own prefs - update"
  ON public.push_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own prefs - delete"
  ON public.push_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
