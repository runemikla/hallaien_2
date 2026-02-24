-- Update role constraint to include 'admin' role
-- Drop the existing CHECK constraint on the role column
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new CHECK constraint with three roles: student (default), teacher, admin
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('student', 'teacher', 'admin'));

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.role IS 'User role: student (default), teacher, or admin. Only admins can change roles.';
