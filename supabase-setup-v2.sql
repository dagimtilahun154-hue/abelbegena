-- Abel Begena production schema
-- Run in the Supabase SQL Editor after auth is enabled.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text default 'student'::text not null check (role in ('student', 'admin')),
  status text default 'pending'::text not null check (status in ('pending', 'approved', 'rejected', 'active')),
  practice_hours numeric default 0 not null,
  completed_tasks integer default 0 not null,
  mastery_score integer default 0 not null,
  global_rank integer default 0 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists role text default 'student'::text not null,
  add column if not exists status text default 'pending'::text not null,
  add column if not exists practice_hours numeric default 0 not null,
  add column if not exists completed_tasks integer default 0 not null,
  add column if not exists mastery_score integer default 0 not null,
  add column if not exists global_rank integer default 0 not null,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
    )
  );

create table if not exists public.students (
  id text primary key,
  name text not null,
  instrument text default 'Begena',
  phone text,
  guardian text,
  guardian_phone text,
  branch text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.students
  add column if not exists name text,
  add column if not exists instrument text default 'Begena',
  add column if not exists phone text,
  add column if not exists guardian text,
  add column if not exists guardian_phone text,
  add column if not exists branch text,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.students enable row level security;

drop policy if exists "Admins can manage attendance students" on public.students;
create policy "Admins can manage attendance students" on public.students
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  student_id text references public.students(id) on delete cascade not null,
  date date not null,
  time time without time zone,
  status text default 'PRESENT' not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.attendance
  add column if not exists student_id text references public.students(id) on delete cascade,
  add column if not exists date date,
  add column if not exists time time without time zone,
  add column if not exists status text default 'PRESENT',
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

create unique index if not exists attendance_student_date_key
  on public.attendance(student_id, date);

alter table public.attendance enable row level security;

drop policy if exists "Admins can manage attendance records" on public.attendance;
create policy "Admins can manage attendance records" on public.attendance
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'student',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

alter table public.courses
  add column if not exists title text,
  add column if not exists instrument text,
  add column if not exists level text default 'All Levels',
  add column if not exists duration text default 'Ongoing',
  add column if not exists lessons integer default 0,
  add column if not exists description text,
  add column if not exists is_active boolean default true,
  add column if not exists sort_order integer default 100,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.courses enable row level security;

drop policy if exists "Anyone can read active courses" on public.courses;
create policy "Anyone can read active courses" on public.courses
  for select using (is_active = true);

drop policy if exists "Admins can manage courses" on public.courses;
create policy "Admins can manage courses" on public.courses
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.student_courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  course_name text not null,
  instructor text,
  level text default 'All Levels',
  progress integer default 0 not null check (progress >= 0 and progress <= 100),
  current_song text,
  next_lesson text,
  streak_days integer default 0 not null,
  completed_lessons integer default 0 not null,
  total_lessons integer default 0 not null,
  delivery_mode text default 'in_person' not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.student_courses
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists course_id uuid references public.courses(id) on delete set null,
  add column if not exists course_name text,
  add column if not exists instructor text,
  add column if not exists level text default 'All Levels',
  add column if not exists progress integer default 0,
  add column if not exists current_song text,
  add column if not exists next_lesson text,
  add column if not exists streak_days integer default 0,
  add column if not exists completed_lessons integer default 0,
  add column if not exists total_lessons integer default 0,
  add column if not exists delivery_mode text default 'in_person',
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.student_courses enable row level security;

drop policy if exists "Users can view own courses" on public.student_courses;
create policy "Users can view own courses" on public.student_courses
  for select using (auth.uid() = user_id);

drop policy if exists "Admins can manage student courses" on public.student_courses;
create policy "Admins can manage student courses" on public.student_courses
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.lesson_videos (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  video_url text not null,
  duration_label text,
  is_active boolean default true not null,
  sort_order integer default 100 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.lesson_videos
  add column if not exists course_id uuid references public.courses(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists video_url text,
  add column if not exists duration_label text,
  add column if not exists is_active boolean default true,
  add column if not exists sort_order integer default 100,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.lesson_videos enable row level security;

drop policy if exists "Authenticated users can read active videos" on public.lesson_videos;
create policy "Authenticated users can read active videos" on public.lesson_videos
  for select using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Admins can manage lesson videos" on public.lesson_videos;
create policy "Admins can manage lesson videos" on public.lesson_videos
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  price_label text default 'Contact for Price' not null,
  pickup_note text default 'In-Person Pickup' not null,
  is_active boolean default true not null,
  sort_order integer default 100 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.products
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists price_label text default 'Contact for Price',
  add column if not exists pickup_note text default 'In-Person Pickup',
  add column if not exists is_active boolean default true,
  add column if not exists sort_order integer default 100,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.products enable row level security;

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products" on public.products
  for select using (is_active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products" on public.products
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  user_email text,
  item_name text not null,
  item_description text,
  quantity integer default 1 not null check (quantity > 0),
  status text default 'pending' not null check (status in ('pending', 'approved', 'fulfilled', 'cancelled')),
  admin_note text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.orders
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists item_name text,
  add column if not exists item_description text,
  add column if not exists quantity integer default 1,
  add column if not exists status text default 'pending',
  add column if not exists admin_note text,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.orders enable row level security;

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders" on public.orders
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.finance_transactions (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount >= 0),
  category text not null,
  description text,
  transaction_date date default current_date not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.finance_transactions
  add column if not exists type text,
  add column if not exists amount numeric,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists transaction_date date default current_date,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.finance_transactions enable row level security;

drop policy if exists "Admins can manage finance transactions" on public.finance_transactions;
create policy "Admins can manage finance transactions" on public.finance_transactions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  author text default 'Admin' not null,
  is_important boolean default false not null,
  audience text default 'students' not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.notifications
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists author text default 'Admin',
  add column if not exists is_important boolean default false,
  add column if not exists audience text default 'students',
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.notifications enable row level security;

drop policy if exists "Authenticated users can read notifications" on public.notifications;
create policy "Authenticated users can read notifications" on public.notifications
  for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage notifications" on public.notifications;
create policy "Admins can manage notifications" on public.notifications
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create table if not exists public.online_registrations (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  middle_name text,
  last_name text not null,
  gender text not null,
  age integer,
  date_of_birth date not null,
  phone text not null,
  email text,
  address text not null,
  sub_city text not null,
  woreda text not null,
  house_number text,
  emergency_name text,
  emergency_phone text,
  instrument_type text not null,
  learning_category text,
  mezmur_or_song text,
  learning_mode text not null,
  source_of_info text,
  photo_path text not null,
  status text default 'pending' not null check (status in ('pending', 'approved', 'active', 'rejected', 'interrupted')),
  admin_note text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.online_registrations
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists gender text,
  add column if not exists age integer,
  add column if not exists date_of_birth date,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists sub_city text,
  add column if not exists woreda text,
  add column if not exists house_number text,
  add column if not exists emergency_name text,
  add column if not exists emergency_phone text,
  add column if not exists instrument_type text,
  add column if not exists learning_category text,
  add column if not exists mezmur_or_song text,
  add column if not exists learning_mode text,
  add column if not exists source_of_info text,
  add column if not exists photo_path text,
  add column if not exists status text default 'pending',
  add column if not exists admin_note text,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()) not null;

alter table public.online_registrations enable row level security;

drop policy if exists "Public can submit registrations" on public.online_registrations;
create policy "Public can submit registrations" on public.online_registrations
  for insert with check (true);

drop policy if exists "Admins can manage registrations" on public.online_registrations;
create policy "Admins can manage registrations" on public.online_registrations
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create or replace function public.check_registration_status(lookup_phone text)
returns table(status text, admin_note text)
language sql
security definer
set search_path = public
as $$
  select online_registrations.status, online_registrations.admin_note
  from public.online_registrations
  where online_registrations.phone = lookup_phone
  order by online_registrations.created_at desc
  limit 1;
$$;

grant execute on function public.check_registration_status(text) to anon, authenticated;

insert into public.courses (title, instrument, level, duration, lessons, description, sort_order)
select seed.title, seed.instrument, seed.level, seed.duration, seed.lessons, seed.description, seed.sort_order
from (
  values
    ('Begena', 'Begena', 'All Levels', '12 Weeks', 24, 'Master the 10 strings, the leather bridge buzzing technique, and foundational posture for the sacred instrument.', 10),
    ('Kirar', 'Kirar', 'All Levels', '10 Weeks', 20, 'Learn the five or six string bowl lyre through tuning, picking technique, and traditional melodies.', 20),
    ('Washint', 'Washint', 'All Levels', '8 Weeks', 16, 'Develop breath control, fingering patterns, and expressive playing on the traditional flute.', 30),
    ('Masinqo', 'Masinqo', 'All Levels', '14 Weeks', 28, 'Explore the single-stringed bowed lute with bowing technique, intonation, and Azmari styles.', 40),
    ('Vocal Class', 'Vocal Class', 'All Levels', 'Ongoing', 48, 'Build vocal strength for spiritual and traditional chants, including Mezmur and Qene practice.', 50)
) as seed(title, instrument, level, duration, lessons, description, sort_order)
where not exists (
  select 1 from public.courses existing
  where lower(existing.title) = lower(seed.title)
);

insert into public.products (name, description, price_label, pickup_note, sort_order)
select seed.name, seed.description, seed.price_label, seed.pickup_note, seed.sort_order
from (
  values
    ('Begena', 'The sacred 10-string lyre, handcrafted with traditional Ethiopian wood and leather bridge.', 'Contact for Price', 'In-Person Pickup', 10),
    ('Kirar', 'A five or six string bowl lyre for traditional melodies and modern Ethiopian music.', 'Contact for Price', 'In-Person Pickup', 20),
    ('Washint', 'Traditional Ethiopian bamboo flute, tuned for authentic pentatonic scale performance.', 'Contact for Price', 'In-Person Pickup', 30),
    ('Masinqo', 'Single-stringed bowed lute with bow and carrying case options.', 'Contact for Price', 'In-Person Pickup', 40)
) as seed(name, description, price_label, pickup_note, sort_order)
where not exists (
  select 1 from public.products existing
  where lower(existing.name) = lower(seed.name)
);

insert into storage.buckets (id, name, public)
values ('registration-photos', 'registration-photos', false)
on conflict (id) do nothing;

drop policy if exists "Public can upload registration photos" on storage.objects;
create policy "Public can upload registration photos" on storage.objects
  for insert with check (bucket_id = 'registration-photos');

drop policy if exists "Admins can read registration photos" on storage.objects;
create policy "Admins can read registration photos" on storage.objects
  for select using (
    bucket_id = 'registration-photos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
