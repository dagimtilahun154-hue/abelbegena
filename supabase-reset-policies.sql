-- Run this if Supabase reports that a policy already exists.
-- It safely removes this app's policies only when the target table exists.

do $$
begin
  if to_regclass('public.profiles') is not null then
    drop policy if exists "Users can view own profile" on public.profiles;
    drop policy if exists "Users can update own profile" on public.profiles;
    drop policy if exists "Users can insert own profile" on public.profiles;
    drop policy if exists "Admins can manage profiles" on public.profiles;
    drop policy if exists "Allow authenticated users to read all profiles" on public.profiles;
    drop policy if exists "Allow authenticated users to update profiles (for admins)" on public.profiles;
  end if;

  if to_regclass('public.courses') is not null then
    drop policy if exists "Anyone can read active courses" on public.courses;
    drop policy if exists "Admins can manage courses" on public.courses;
  end if;

  if to_regclass('public.student_courses') is not null then
    drop policy if exists "Users can view own courses" on public.student_courses;
    drop policy if exists "Users can insert own courses" on public.student_courses;
    drop policy if exists "Authenticated can read all courses" on public.student_courses;
    drop policy if exists "Admins can manage student courses" on public.student_courses;
  end if;

  if to_regclass('public.lesson_videos') is not null then
    drop policy if exists "Authenticated users can read active videos" on public.lesson_videos;
    drop policy if exists "Admins can manage lesson videos" on public.lesson_videos;
  end if;

  if to_regclass('public.products') is not null then
    drop policy if exists "Anyone can read active products" on public.products;
    drop policy if exists "Admins can manage products" on public.products;
  end if;

  if to_regclass('public.orders') is not null then
    drop policy if exists "Users can view own orders" on public.orders;
    drop policy if exists "Users can insert own orders" on public.orders;
    drop policy if exists "Authenticated can read all orders" on public.orders;
    drop policy if exists "Authenticated can update orders" on public.orders;
    drop policy if exists "Admins can manage orders" on public.orders;
  end if;

  if to_regclass('public.finance_transactions') is not null then
    drop policy if exists "Admins can manage finance transactions" on public.finance_transactions;
  end if;

  if to_regclass('public.notifications') is not null then
    drop policy if exists "Authenticated users can read notifications" on public.notifications;
    drop policy if exists "Anyone authenticated can read notifications" on public.notifications;
    drop policy if exists "Anyone authenticated can insert notifications" on public.notifications;
    drop policy if exists "Admins can manage notifications" on public.notifications;
  end if;

  if to_regclass('public.online_registrations') is not null then
    drop policy if exists "Public can submit registrations" on public.online_registrations;
    drop policy if exists "Public can check registration by phone" on public.online_registrations;
    drop policy if exists "Admins can manage registrations" on public.online_registrations;
  end if;

  if to_regclass('storage.objects') is not null then
    drop policy if exists "Public can upload registration photos" on storage.objects;
    drop policy if exists "Admins can read registration photos" on storage.objects;
  end if;
end $$;
