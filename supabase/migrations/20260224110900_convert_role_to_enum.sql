-- Convert role column from TEXT to a proper ENUM type

-- 1. Create the enum type
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');

-- 2. Drop the existing CHECK constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Convert the column from TEXT to the enum type
ALTER TABLE public.profiles
ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles
ALTER COLUMN role TYPE public.user_role USING role::public.user_role;

ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'student';

-- 4. Keep the documentation comment
COMMENT ON COLUMN public.profiles.role IS 'User role: student (default), teacher, or admin. Only admins can change roles.';
