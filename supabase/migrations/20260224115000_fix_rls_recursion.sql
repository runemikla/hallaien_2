-- Fix RLS infinite recursion between assistants and assistant_utdanningsprogram
-- The issue: assistant_utdanningsprogram policy references assistants table,
-- and assistants policy references assistant_utdanningsprogram table.

-- Fix: change assistant_utdanningsprogram "manage" policy to use teacher_id directly
-- instead of checking via the assistants table.

DROP POLICY IF EXISTS "Teachers can manage own assistant programs" ON public.assistant_utdanningsprogram;

-- Use a simpler policy that checks teacher_id from the insert context
-- Teachers can insert into assistant_utdanningsprogram for their own assistants
CREATE POLICY "Teachers can insert assistant programs"
    ON public.assistant_utdanningsprogram
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assistants
            WHERE id = assistant_id AND teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete assistant programs"
    ON public.assistant_utdanningsprogram
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.assistants
            WHERE id = assistant_id AND teacher_id = auth.uid()
        )
    );

-- The SELECT policy "Anyone can read assistant programs" already exists and is fine
-- The issue is the FOR ALL policy that covered SELECT too, causing recursion
-- Now INSERT/DELETE are separate from SELECT, breaking the cycle since
-- the students policy on assistants only does SELECT which hits the
-- "Anyone can read" policy on assistant_utdanningsprogram (no recursion)
