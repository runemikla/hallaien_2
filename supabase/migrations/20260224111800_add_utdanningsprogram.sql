-- Add utdanningsprogram column to profiles table

-- 1. Create enum type for utdanningsprogram
CREATE TYPE public.utdanningsprogram AS ENUM ('FBIE', 'TIF', 'HO');

-- 2. Add column as an array of the enum, default to empty array
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS utdanningsprogram public.utdanningsprogram[] DEFAULT '{}';

-- 3. Create a trigger function that sets default based on role
CREATE OR REPLACE FUNCTION public.set_default_utdanningsprogram()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set default if utdanningsprogram is not explicitly provided (empty or null)
    IF NEW.utdanningsprogram IS NULL OR array_length(NEW.utdanningsprogram, 1) IS NULL THEN
        IF NEW.role IN ('teacher', 'admin') THEN
            NEW.utdanningsprogram := ARRAY['FBIE', 'TIF', 'HO']::public.utdanningsprogram[];
        ELSE
            NEW.utdanningsprogram := '{}'::public.utdanningsprogram[];
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on INSERT
CREATE TRIGGER set_utdanningsprogram_on_insert
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_utdanningsprogram();

-- 5. Update existing rows to match the desired defaults
UPDATE public.profiles
SET utdanningsprogram = ARRAY['FBIE', 'TIF', 'HO']::public.utdanningsprogram[]
WHERE role IN ('teacher', 'admin');

UPDATE public.profiles
SET utdanningsprogram = '{}'::public.utdanningsprogram[]
WHERE role = 'student';

-- 6. Documentation
COMMENT ON COLUMN public.profiles.utdanningsprogram IS 'Array of utdanningsprogram the user belongs to. Teachers and admins default to all programs, students default to none.';
