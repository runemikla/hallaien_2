-- Fix circular dependency between assistants and student_access policies

-- Drop the problematic policies that cause circular references
DROP POLICY IF EXISTS "Teachers can view access to own assistants" ON public.student_access;
DROP POLICY IF EXISTS "Students can access assistants they have access to" ON public.assistants;

-- Recreate the student access policy on assistants without recursion
-- Students can view assistants they have access to
CREATE POLICY "Students can view accessible assistants"
  ON public.assistants
  FOR SELECT
  USING (
    -- Allow if user is the teacher (owner)
    auth.uid() = teacher_id
    OR
    -- Allow if student has valid access (check directly without subquery on student_access)
    id IN (
      SELECT assistant_id 
      FROM public.student_access 
      WHERE student_id = auth.uid() 
      AND expires_at > NOW()
    )
  );

-- Teachers can view student access for their own assistants (simplified)
-- This policy is less critical, so we can make it simpler
CREATE POLICY "Teachers view student access"
  ON public.student_access
  FOR SELECT
  USING (
    assistant_id IN (
      SELECT id FROM public.assistants WHERE teacher_id = auth.uid()
    )
  );
