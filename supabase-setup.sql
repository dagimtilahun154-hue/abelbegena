-- Run this script in your Supabase SQL Editor

-- Create a table for user profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  name text,
  role text DEFAULT 'student'::text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on row level security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

-- Optional: Allow anyone to insert a profile (or restrict it to a trigger on auth.users)
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- (For Admin Dashboard to work, you might want a policy that allows admins to read all profiles, 
-- but for simplicity you can also enable reading for all authenticated users temporarily,
-- or create a specific admin policy.)
CREATE POLICY "Allow authenticated users to read all profiles" 
ON public.profiles FOR SELECT 
USING ( auth.role() = 'authenticated' );

CREATE POLICY "Allow authenticated users to update profiles (for admins)"
ON public.profiles FOR UPDATE
USING ( auth.role() = 'authenticated' );

-- Set up a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'student', 'pending');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
