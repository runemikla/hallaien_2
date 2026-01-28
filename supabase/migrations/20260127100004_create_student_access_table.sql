-- Create student_access table to track which students can access which assistants
CREATE TABLE public.student_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(student_id, assistant_id)
);

-- Enable Row Level Security
ALTER TABLE public.student_access ENABLE ROW LEVEL SECURITY;

-- Students can view only their own active access records
CREATE POLICY "Students can view own access"
  ON public.student_access
  FOR SELECT
  USING (
    auth.uid() = student_id 
    AND expires_at > NOW()
  );

-- Teachers can view access records for their assistants
CREATE POLICY "Teachers can view access to own assistants"
  ON public.student_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assistants 
      WHERE id = assistant_id AND teacher_id = auth.uid()
    )
  );

-- Allow insert via server action (service role) - students redeeming codes
CREATE POLICY "Service role can insert access"
  ON public.student_access
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX student_access_student_id_idx ON public.student_access(student_id);
CREATE INDEX student_access_assistant_id_idx ON public.student_access(assistant_id);
CREATE INDEX student_access_expires_at_idx ON public.student_access(expires_at);

-- Policy for students to access assistants via this table
CREATE POLICY "Students can access assistants they have access to"
  ON public.assistants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_access
      WHERE student_access.assistant_id = assistants.id
      AND student_access.student_id = auth.uid()
      AND student_access.expires_at > NOW()
    )
  );
