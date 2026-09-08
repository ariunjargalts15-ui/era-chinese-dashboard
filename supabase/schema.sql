-- ERA Chinese — the school, as tables.
--
-- Run this once in the Supabase SQL editor of a new project. It is safe to run
-- again: everything is IF NOT EXISTS or CREATE OR REPLACE, and the policies are
-- dropped before being recreated.
--
-- The important half of this file is the row-level security at the bottom.
-- Without it every signed-in student could read every other student's grades
-- and invoices, because the browser talks to the database directly and the
-- anon key is public by design. RLS is what makes that safe: the database
-- itself refuses to hand a student anyone else's rows.

-- ─────────────────────────────────────────────────────────────
-- who is who
-- ─────────────────────────────────────────────────────────────

-- A person. id matches auth.users.id once they have signed in at least once.
-- A teacher can also create a profile for someone who has not signed up yet;
-- that row has a null id until they register with the same email, and the
-- trigger below joins the two together.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null default 'student' check (role in ('teacher', 'student')),
  name          text not null default '',
  cn            text not null default '',
  email         text not null,
  title         text not null default '',
  color         text not null default '#5227E0',
  status        text not null default 'active' check (status in ('active', 'graduated')),
  graduated_at  date,
  joined_at     date not null default current_date,
  wants_class_id text,
  created_at    timestamptz not null default now()
);
create unique index if not exists profiles_email_key on public.profiles (lower(email));

-- A student the school has entered but who has not registered yet. When they
-- sign up with this email the trigger copies these details onto their profile
-- and deletes the invite, so the enrolment and invoices they already have
-- follow them in.
create table if not exists public.invites (
  email          text primary key,
  name           text not null default '',
  cn             text not null default '',
  role           text not null default 'student' check (role in ('teacher', 'student')),
  title          text not null default '',
  wants_class_id text,
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- the school
-- ─────────────────────────────────────────────────────────────
create table if not exists public.school (
  id        int primary key default 1 check (id = 1),
  name      text not null default 'ERA CHINESE',
  cn        text not null default '时代汉语',
  phone     text not null default '',
  phone2    text not null default '',
  email     text not null default '',
  support   text not null default '',
  address   text not null default '',
  facebook  text not null default '',
  instagram text not null default ''
);
insert into public.school (id) values (1) on conflict (id) do nothing;

create table if not exists public.rooms (
  name text primary key
);

create table if not exists public.classes (
  id         text primary key,
  name       text not null default '',
  cn         text not null default '',
  level      text not null default '',
  room       text not null default '',
  teacher_id uuid references public.profiles(id) on delete set null,
  days       text not null default '',
  time       text not null default '',
  fee        integer
);

-- the roster, as rows rather than an array, so one student joining is one write
create table if not exists public.enrolments (
  class_id   text not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

create table if not exists public.lessons (
  id       text primary key,
  class_id text not null references public.classes(id) on delete cascade,
  deck_id  text,
  title    text not null default '',
  cn       text not null default '',
  date     date not null,
  time     text not null default '',
  topic    text not null default '',
  homework text not null default '',
  notes    text not null default '',
  status   text not null default 'scheduled',
  words    jsonb not null default '[]'::jsonb,
  online   jsonb
);
create index if not exists lessons_class_idx on public.lessons (class_id);

create table if not exists public.attendance (
  lesson_id  text not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  mark       text not null,
  primary key (lesson_id, student_id)
);

create table if not exists public.submissions (
  lesson_id    text not null references public.lessons(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  submitted_at date,
  text         text not null default '',
  grade        integer,
  feedback     text not null default '',
  primary key (lesson_id, student_id)
);

create table if not exists public.progress (
  class_id   text not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  speaking   integer not null default 0,
  listening  integer not null default 0,
  reading    integer not null default 0,
  writing    integer not null default 0,
  updated    date,
  primary key (class_id, student_id)
);

create table if not exists public.payments (
  id         text primary key,
  class_id   text not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  period     text not null,
  amount     integer not null default 0,
  due_date   date,
  paid_at    date,
  advance    integer not null default 0,
  method     text not null default '',
  note       text not null default ''
);
create index if not exists payments_student_idx on public.payments (student_id);
-- one invoice per student, class and month
create unique index if not exists payments_unique_period
  on public.payments (class_id, student_id, period);

create table if not exists public.news (
  id        text primary key,
  title     text not null default '',
  cn        text not null default '',
  body      text not null default '',
  date      date not null default current_date,
  pinned    boolean not null default false,
  published boolean not null default false,
  author_id uuid references public.profiles(id) on delete set null
);

-- vocabulary decks are shipped content, the same for everyone
create table if not exists public.decks (
  id    text primary key,
  name  text not null default '',
  cn    text not null default '',
  words jsonb not null default '[]'::jsonb
);

-- ─────────────────────────────────────────────────────────────
-- a new sign-up becomes a profile
-- ─────────────────────────────────────────────────────────────
-- Registration goes through Supabase Auth, and this is what gives the new
-- account its profile. It always writes role 'student': role is never taken
-- from anything the browser sent, so nobody can sign themselves up as staff.
-- The one exception is an invite the school created, which may name a role —
-- that row can only have been written by a teacher.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
begin
  select * into inv from public.invites where lower(email) = lower(new.email);

  insert into public.profiles (id, role, name, cn, email, title, wants_class_id)
  values (
    new.id,
    coalesce(inv.role, 'student'),
    coalesce(nullif(inv.name, ''), new.raw_user_meta_data->>'name', ''),
    coalesce(inv.cn, ''),
    new.email,
    coalesce(inv.title, ''),
    coalesce(inv.wants_class_id, new.raw_user_meta_data->>'wants_class_id')
  )
  on conflict (id) do nothing;

  -- anything already recorded against the invite now belongs to a real account
  if inv.email is not null then
    delete from public.invites where email = inv.email;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- row-level security
-- ─────────────────────────────────────────────────────────────
-- is_teacher() is security definer so it can read profiles without recursing
-- through the very policies it is being used by.
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  );
$$;

-- classes the current student is enrolled in
create or replace function public.my_class_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select class_id from public.enrolments where student_id = auth.uid();
$$;

alter table public.profiles    enable row level security;
alter table public.invites     enable row level security;
alter table public.school      enable row level security;
alter table public.rooms       enable row level security;
alter table public.classes     enable row level security;
alter table public.enrolments  enable row level security;
alter table public.lessons     enable row level security;
alter table public.attendance  enable row level security;
alter table public.submissions enable row level security;
alter table public.progress    enable row level security;
alter table public.payments    enable row level security;
alter table public.news        enable row level security;
alter table public.decks       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','invites','school','rooms','classes','enrolments',
                           'lessons','attendance','submissions','progress','payments','news','decks']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_teacher_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_student_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_student_write', t);
  end loop;
end $$;

-- Staff run the school: full access to every table.
do $$
declare t text;
begin
  foreach t in array array['profiles','invites','school','rooms','classes','enrolments',
                           'lessons','attendance','submissions','progress','payments','news','decks']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_teacher()) with check (public.is_teacher())',
      t || '_teacher_all', t);
  end loop;
end $$;

-- A student sees themselves, the staff who teach them, and their own records.

-- their own profile, and every teacher (the timetable prints the teacher's name)
create policy profiles_student_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or role = 'teacher');

-- they may edit their own name, not their role — the role check keeps a student
-- from promoting themselves to staff
create policy profiles_student_write on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = 'student');

create policy school_student_read on public.school
  for select to authenticated using (true);
create policy rooms_student_read on public.rooms
  for select to authenticated using (true);
create policy decks_student_read on public.decks
  for select to authenticated using (true);

-- only what the school has published
create policy news_student_read on public.news
  for select to authenticated using (published = true);

-- only classes they are in
create policy classes_student_read on public.classes
  for select to authenticated
  using (id in (select public.my_class_ids()));

-- their own enrolments only: the roster of a class is not a student's business
create policy enrolments_student_read on public.enrolments
  for select to authenticated using (student_id = auth.uid());

create policy lessons_student_read on public.lessons
  for select to authenticated
  using (class_id in (select public.my_class_ids()));

create policy attendance_student_read on public.attendance
  for select to authenticated using (student_id = auth.uid());

create policy progress_student_read on public.progress
  for select to authenticated using (student_id = auth.uid());

create policy payments_student_read on public.payments
  for select to authenticated using (student_id = auth.uid());

-- Homework is the one thing a student writes. They may hand in and revise their
-- own submission; grade and feedback are the teacher's, and the trigger below
-- stops a student from writing to them.
create policy submissions_student_read on public.submissions
  for select to authenticated using (student_id = auth.uid());

create policy submissions_student_write on public.submissions
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create or replace function public.guard_submission_marking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_teacher() then
    return new;
  end if;
  -- a student may write their answer, never their mark
  if tg_op = 'INSERT' then
    new.grade := null;
    new.feedback := '';
  else
    new.grade := old.grade;
    new.feedback := old.feedback;
  end if;
  return new;
end;
$$;

drop trigger if exists submissions_guard on public.submissions;
create trigger submissions_guard
  before insert or update on public.submissions
  for each row execute function public.guard_submission_marking();

-- ─────────────────────────────────────────────────────────────
-- live updates
-- ─────────────────────────────────────────────────────────────
-- What the app subscribes to so a mark made on one device shows up on another.
-- Realtime respects RLS, so a student is only ever sent their own rows.
do $$
declare t text;
begin
  foreach t in array array['profiles','school','rooms','classes','enrolments',
                           'lessons','attendance','submissions','progress','payments','news']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
