create table public.family_tree_custom_themes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  hue integer not null check (hue between 0 and 359),
  accent_hue integer not null check (accent_hue between 0 and 359),
  created_at timestamptz not null default now(),
  unique (id, family_id)
);

alter table public.family_tree_custom_themes enable row level security;
grant select, insert, delete on public.family_tree_custom_themes to authenticated;

create policy "Family members can read custom tree themes"
  on public.family_tree_custom_themes for select to authenticated
  using (public.is_family_member(family_id));
create policy "Family owners can create custom tree themes"
  on public.family_tree_custom_themes for insert to authenticated
  with check (public.is_family_owner(family_id));
create policy "Family owners can delete custom tree themes"
  on public.family_tree_custom_themes for delete to authenticated
  using (public.is_family_owner(family_id));

create function public.limit_family_custom_tree_themes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.families where id = new.family_id for update;
  if (select count(*) from public.family_tree_custom_themes
      where family_id = new.family_id) >= 5 then
    raise exception 'A family can save up to five custom tree themes.';
  end if;
  return new;
end;
$$;

create trigger limit_family_custom_tree_themes
  before insert on public.family_tree_custom_themes
  for each row execute function public.limit_family_custom_tree_themes();

alter table public.families add column custom_tree_theme_id uuid;
alter table public.families
  add constraint families_custom_tree_theme_fkey
  foreign key (custom_tree_theme_id, id)
  references public.family_tree_custom_themes(id, family_id)
  on delete set null (custom_tree_theme_id);
grant update (custom_tree_theme_id) on public.families to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public'
         and tablename = 'family_tree_custom_themes'
     ) then
    alter publication supabase_realtime add table public.family_tree_custom_themes;
  end if;
end;
$$;
