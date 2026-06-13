-- Repair migration for:
-- ERROR: 42P01: relation "public.student_courses" does not exist
--
-- Run this first, then rerun supabase-setup-v2.sql.

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text default 'student'::text not null,
  status text default 'pending'::text not null,
  practice_hours numeric default 0 not null,
  completed_tasks integer default 0 not null,
  mastery_score integer default 0 not null,
  global_rank integer default 0 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  instrument text not null,
  level text default 'All Levels' not null,
  duration text default 'Ongoing' not null,
  lessons integer default 0 not null,
  description text not null,
  is_active boolean default true not null,
  sort_order integer default 100 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.student_courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  course_name text not null,
  instructor text,
  level text default 'All Levels',
  progress integer default 0 not null check (progress >= 0 and progress <= 100),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.student_courses enable row level security;

drop policy if exists "Users can view own courses" on public.student_courses;
create policy "Users can view own courses" on public.student_courses
  for select using (auth.uid() = user_id);

drop policy if exists "Admins can manage student courses" on public.student_courses;
create policy "Admins can manage student courses" on public.student_courses
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
