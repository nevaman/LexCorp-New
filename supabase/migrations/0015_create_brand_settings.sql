create table if not exists public.brand_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  company_name text not null default 'LexCorp',
  primary_color text not null default '#f97316',
  font_family text not null default 'DM Sans',
  tone text not null default 'Professional, firm, and concise.',
  logo_url text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brand_settings enable row level security;

create policy "Members can read brand settings"
on public.brand_settings
for select
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = brand_settings.organization_id
      and om.user_id = auth.uid()
  )
);

create policy "Org admins manage brand settings"
on public.brand_settings
for insert
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = brand_settings.organization_id
      and om.user_id = auth.uid()
      and om.role = 'org_admin'
  )
);

create policy "Org admins update brand settings"
on public.brand_settings
for update
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = brand_settings.organization_id
      and om.user_id = auth.uid()
      and om.role = 'org_admin'
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = brand_settings.organization_id
      and om.user_id = auth.uid()
      and om.role = 'org_admin'
  )
);

