-- Gemini Live: assistants are defined in the app (system instruction + voice)
-- instead of pointing to an ElevenLabs agent.
ALTER TABLE public.assistants
  ADD COLUMN IF NOT EXISTS system_instruction TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS voice TEXT NOT NULL DEFAULT 'Kore';

ALTER TABLE public.assistants
  ALTER COLUMN elevenlabs_agent_id DROP NOT NULL;

COMMENT ON COLUMN public.assistants.system_instruction IS 'System instruction sent to Gemini Live. Only used server-side when issuing an ephemeral token.';
COMMENT ON COLUMN public.assistants.voice IS 'Gemini Live prebuilt voice name, e.g. Kore, Puck, Charon.';
