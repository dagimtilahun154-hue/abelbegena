-- Admin bootstrap for the production login.
--
-- Step 1: In Supabase Dashboard > Authentication > Users, create a user:
-- Email: abeladmin@abelbegena.local
-- Password: admin@abel123
--
-- Step 2: Run this SQL after the user exists.
-- The frontend also accepts username "Abeladmin" and maps it to this email.

insert into public.profiles (id, email, name, role, status)
select auth_user.id, auth_user.email, 'Abel Admin', 'admin', 'approved'
from auth.users auth_user
where lower(auth_user.email) = 'abeladmin@abelbegena.local'
on conflict (id) do update
set
  email = excluded.email,
  name = 'Abel Admin',
  role = 'admin',
  status = 'approved';

update public.profiles
set role = 'admin',
    status = 'approved',
    name = coalesce(name, 'Abel Admin')
where lower(email) = 'abeladmin@abelbegena.local';
