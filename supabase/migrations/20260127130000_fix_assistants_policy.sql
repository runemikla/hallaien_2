-- Fix infinite recursion in assistants INSERT policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Teachers can create assistants" ON public.assistants;

-- Create a simpler policy without the profiles table check
CREATE POLICY "Teachers can create assistants"
  ON public.assistants
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);
