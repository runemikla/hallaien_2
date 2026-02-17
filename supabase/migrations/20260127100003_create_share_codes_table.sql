-- Create share_codes table for time-limited access codes
CREATE TABLE public.share_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.share_codes ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own share codes
CREATE POLICY "Teachers can view own share codes"
  ON public.share_codes
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can create share codes for their assistants
CREATE POLICY "Teachers can create share codes"
  ON public.share_codes
  FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM public.assistants 
      WHERE id = assistant_id AND teacher_id = auth.uid()
    )
  );

-- Teachers can delete their own share codes
CREATE POLICY "Teachers can delete own share codes"
  ON public.share_codes
  FOR DELETE
  USING (auth.uid() = teacher_id);

-- Allow anyone to validate a code (read-only, for code redemption)
CREATE POLICY "Anyone can validate share codes"
  ON public.share_codes
  FOR SELECT
  USING (expires_at > NOW());

-- Create indexes for performance
CREATE INDEX share_codes_code_idx ON public.share_codes(code);
CREATE INDEX share_codes_assistant_id_idx ON public.share_codes(assistant_id);
CREATE INDEX share_codes_expires_at_idx ON public.share_codes(expires_at);

-- Function to generate a random 6-character code
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
