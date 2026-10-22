-- =========================================================
-- Admin panel schema for multi-site static websites
-- Run once in: Supabase Dashboard > SQL Editor > New query
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------

-- One row per client website
create table if not exists public.sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,           -- used by the public site, e.g. 'client-1'
  created_at  timestamptz not null default now()
);

-- Which users may manage which site (assigned manually, never by the client)
create table if not exists public.site_members (
  site_id  uuid not null references public.sites(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  primary key (site_id, user_id)
);

-- Contact info. lang = 'all' means shared across languages,
-- a specific language overrides the shared values for that language.
create table if not exists public.site_contacts (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  lang        text not null default 'all' check (lang in ('all', 'ar', 'en', 'tr')),
  phone       text,
  whatsapp    text,
  email       text,
  address     text,
  social      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (site_id, lang)
);

-- Image slots: key = 'logo', 'hero', 'service-1', ... ; path = object path in storage
create table if not exists public.site_images (
  site_id     uuid not null references public.sites(id) on delete cascade,
  key         text not null,
  path        text not null,
  updated_at  timestamptz not null default now(),
  primary key (site_id, key)
);

-- ---------- Helper: is the current user a member of this site? ----------

create or replace function public.is_site_member(_site uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_members
    where site_id = _site and user_id = auth.uid()
  );
$$;

revoke all on function public.is_site_member(uuid) from public;
grant execute on function public.is_site_member(uuid) to anon, authenticated;

-- ---------- Row Level Security ----------

alter table public.sites         enable row level security;
alter table public.site_members  enable row level security;
alter table public.site_contacts enable row level security;
alter table public.site_images   enable row level security;

-- sites: public website (anon) can read; members can read their own site
create policy "anon read sites"
  on public.sites for select to anon
  using (true);

create policy "members read their sites"
  on public.sites for select to authenticated
  using (public.is_site_member(id));

-- site_members: a user can only see their own memberships; nobody else can write
create policy "users read own memberships"
  on public.site_members for select to authenticated
  using (user_id = auth.uid());

-- site_contacts: public read; members manage their own site's rows
create policy "anon read contacts"
  on public.site_contacts for select to anon
  using (true);

create policy "members manage contacts"
  on public.site_contacts for all to authenticated
  using (public.is_site_member(site_id))
  with check (public.is_site_member(site_id));

-- site_images: public read; members manage their own site's rows
create policy "anon read images"
  on public.site_images for select to anon
  using (true);

create policy "members manage images"
  on public.site_images for all to authenticated
  using (public.is_site_member(site_id))
  with check (public.is_site_member(site_id));

-- Note: no insert/update/delete policies on sites or site_members for clients.
-- Only you (dashboard / service_role) can create sites and assign members.

-- ---------- Storage ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images', 'site-images', true,
  2097152,                                   -- 2 MB hard limit
  array['image/jpeg', 'image/png', 'image/webp']  -- SVG excluded on purpose (script risk)
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored as: <site_id>/<key>-<timestamp>.<ext>
-- Public URLs work for everyone because the bucket is public (read-only).
-- Only members of the site in the first folder may upload, replace, or delete.
create policy "members manage their site images"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'site-images'
    and public.is_site_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'site-images'
    and public.is_site_member(((storage.foldername(name))[1])::uuid)
  );

-- ---------- Example: create a site and assign a client ----------
-- 1) Create the client account: Authentication > Users > Add user (email + password).
--    Then disable public sign-ups: Authentication > Providers > Email > turn OFF "Allow new users to sign up".
-- 2) Run (replace the values):
--
-- insert into public.sites (name, slug) values ('شركة العميل', 'client-1');
--
-- insert into public.site_members (site_id, user_id)
-- select s.id, u.id
-- from public.sites s, auth.users u
-- where s.slug = 'client-1' and u.email = 'client@example.com';
