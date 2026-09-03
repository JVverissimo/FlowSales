-- Roles enum
create type public.app_role as enum ('gestor', 'sdr');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles (separate to avoid privilege escalation)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security-definer role checker
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Profiles RLS
create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Gestores can view all profiles"
on public.profiles for select to authenticated
using (public.has_role(auth.uid(), 'gestor'));

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id);

create policy "Gestores can update any profile"
on public.profiles for update to authenticated
using (public.has_role(auth.uid(), 'gestor'));

create policy "Users can insert their own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

-- User roles RLS
create policy "Users can view their own roles"
on public.user_roles for select to authenticated
using (user_id = auth.uid());

create policy "Gestores can view all roles"
on public.user_roles for select to authenticated
using (public.has_role(auth.uid(), 'gestor'));

create policy "Gestores can manage roles"
on public.user_roles for all to authenticated
using (public.has_role(auth.uid(), 'gestor'))
with check (public.has_role(auth.uid(), 'gestor'));

-- Auto-create profile on signup; metadata.role used to assign initial role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'telefone'
  );

  insert into public.user_roles (user_id, role)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'sdr')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();