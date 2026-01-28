-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' 
CHECK (role IN ('teacher', 'student'));

-- Create index for role queries
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
