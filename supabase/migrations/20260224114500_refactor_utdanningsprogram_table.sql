-- ============================================================
-- Refactor utdanningsprogram: enum arrays → relational tables
-- ============================================================

-- 1. Create utdanningsprogram table
CREATE TABLE public.utdanningsprogram_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.utdanningsprogram_table ENABLE ROW LEVEL SECURITY;

-- Everyone can read utdanningsprogram
CREATE POLICY "Anyone can read utdanningsprogram"
    ON public.utdanningsprogram_table
    FOR SELECT
    USING (true);

-- Only admins can modify (via service role)
CREATE POLICY "Service role can manage utdanningsprogram"
    ON public.utdanningsprogram_table
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Seed initial programs
INSERT INTO public.utdanningsprogram_table (code, name) VALUES
    ('FBIE', 'Frisør, blomster, interiør og eksponeringsdesign'),
    ('TIF', 'Teknologi- og industrifag'),
    ('HO', 'Helse- og oppvekstfag');

-- 3. Create junction table: profile ↔ utdanningsprogram
CREATE TABLE public.profile_utdanningsprogram (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    utdanningsprogram_id UUID NOT NULL REFERENCES public.utdanningsprogram_table(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, utdanningsprogram_id)
);

ALTER TABLE public.profile_utdanningsprogram ENABLE ROW LEVEL SECURITY;

-- Users can view their own programs
CREATE POLICY "Users can view own programs"
    ON public.profile_utdanningsprogram
    FOR SELECT
    USING (auth.uid() = profile_id);

-- Admins can manage all profile programs
CREATE POLICY "Admins can manage profile programs"
    ON public.profile_utdanningsprogram
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Service role insert for triggers
CREATE POLICY "Service role can insert profile programs"
    ON public.profile_utdanningsprogram
    FOR INSERT
    WITH CHECK (true);

CREATE INDEX profile_utdanningsprogram_profile_idx ON public.profile_utdanningsprogram(profile_id);
CREATE INDEX profile_utdanningsprogram_program_idx ON public.profile_utdanningsprogram(utdanningsprogram_id);

-- 4. Create junction table: assistant ↔ utdanningsprogram
CREATE TABLE public.assistant_utdanningsprogram (
    assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
    utdanningsprogram_id UUID NOT NULL REFERENCES public.utdanningsprogram_table(id) ON DELETE CASCADE,
    PRIMARY KEY (assistant_id, utdanningsprogram_id)
);

ALTER TABLE public.assistant_utdanningsprogram ENABLE ROW LEVEL SECURITY;

-- Anyone can read assistant programs (needed for student access check)
CREATE POLICY "Anyone can read assistant programs"
    ON public.assistant_utdanningsprogram
    FOR SELECT
    USING (true);

-- Teachers can manage their own assistant programs
CREATE POLICY "Teachers can manage own assistant programs"
    ON public.assistant_utdanningsprogram
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.assistants
            WHERE id = assistant_id AND teacher_id = auth.uid()
        )
    );

CREATE INDEX assistant_utdanningsprogram_assistant_idx ON public.assistant_utdanningsprogram(assistant_id);
CREATE INDEX assistant_utdanningsprogram_program_idx ON public.assistant_utdanningsprogram(utdanningsprogram_id);

-- 5. Migrate existing data from array columns to junction tables

-- Profiles: migrate utdanningsprogram arrays
INSERT INTO public.profile_utdanningsprogram (profile_id, utdanningsprogram_id)
SELECT p.id, ut.id
FROM public.profiles p,
     LATERAL unnest(p.utdanningsprogram) AS prog_code
JOIN public.utdanningsprogram_table ut ON ut.code = prog_code::text
ON CONFLICT DO NOTHING;

-- Assistants: migrate utdanningsprogram arrays
INSERT INTO public.assistant_utdanningsprogram (assistant_id, utdanningsprogram_id)
SELECT a.id, ut.id
FROM public.assistants a,
     LATERAL unnest(a.utdanningsprogram) AS prog_code
JOIN public.utdanningsprogram_table ut ON ut.code = prog_code::text
ON CONFLICT DO NOTHING;

-- 6. Drop old array columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS utdanningsprogram;
ALTER TABLE public.assistants DROP COLUMN IF EXISTS utdanningsprogram;

-- 7. Drop the old enum type and trigger
DROP TRIGGER IF EXISTS set_utdanningsprogram_on_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.set_default_utdanningsprogram();
DROP TYPE IF EXISTS public.utdanningsprogram;

-- 8. Add RLS policy: students can view assistants that match their utdanningsprogram
CREATE POLICY "Students can access assistants via utdanningsprogram"
    ON public.assistants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.assistant_utdanningsprogram au
            JOIN public.profile_utdanningsprogram pu
                ON au.utdanningsprogram_id = pu.utdanningsprogram_id
            WHERE au.assistant_id = assistants.id
              AND pu.profile_id = auth.uid()
        )
    );
