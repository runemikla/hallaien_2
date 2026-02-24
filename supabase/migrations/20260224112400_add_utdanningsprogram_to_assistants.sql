-- Add utdanningsprogram column to assistants table
-- Reuses the existing public.utdanningsprogram enum type (FBIE, TIF, HO)

ALTER TABLE public.assistants
ADD COLUMN IF NOT EXISTS utdanningsprogram public.utdanningsprogram[] DEFAULT '{}';

COMMENT ON COLUMN public.assistants.utdanningsprogram IS 'Array of utdanningsprogram this assistant is available for. Selected by teacher during creation.';
