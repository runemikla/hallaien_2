-- Create assistants table for storing ElevenLabs agent info
CREATE TABLE public.assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  elevenlabs_agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;

-- Teachers can view only their own assistants
CREATE POLICY "Teachers can view own assistants"
  ON public.assistants
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can create assistants
CREATE POLICY "Teachers can create assistants"
  ON public.assistants
  FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Teachers can update only their own assistants
CREATE POLICY "Teachers can update own assistants"
  ON public.assistants
  FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Teachers can delete only their own assistants
CREATE POLICY "Teachers can delete own assistants"
  ON public.assistants
  FOR DELETE
  USING (auth.uid() = teacher_id);

-- Create indexes for performance
CREATE INDEX assistants_teacher_id_idx ON public.assistants(teacher_id);
CREATE INDEX assistants_elevenlabs_agent_id_idx ON public.assistants(elevenlabs_agent_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assistants_updated_at
  BEFORE UPDATE ON public.assistants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
