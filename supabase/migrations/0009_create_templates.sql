create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_office_id uuid references public.branch_offices (id) on delete set null,
  name text not null,
  description text,
  sections jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  visibility text not null default 'organization' check (visibility in ('organization','branch')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_org_idx on public.templates (organization_id);
create index if not exists templates_branch_idx on public.templates (branch_office_id);

drop trigger if exists set_templates_updated_at on public.templates;

create trigger set_templates_updated_at
before update on public.templates
for each row
execute procedure public.set_updated_at();

