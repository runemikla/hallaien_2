-- Add policy for students to view assistants they have access to
CREATE POLICY "Students can view accessible assistants"
  ON assistants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_access
      WHERE student_access.assistant_id = assistants.id
        AND student_access.student_id = auth.uid()
        AND student_access.expires_at > now()
    )
  );
