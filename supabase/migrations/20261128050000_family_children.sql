create table public.family_children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, family_id, parent_id),
  foreign key (family_id, parent_id)
    references public.family_members (family_id, user_id) on delete cascade
);

alter table public.wish_lists
  add column child_id uuid,
  add constraint wish_lists_child_family_parent_fkey
    foreign key (child_id, family_id, owner_id)
    references public.family_children (id, family_id, parent_id) on delete cascade;

alter table public.gifts
  drop constraint gifts_list_owner_family_fkey,
  add constraint gifts_list_owner_family_fkey
    foreign key (list_id, family_id, owner_id)
    references public.wish_lists (id, family_id, owner_id) on delete cascade;

create index family_children_family_parent_idx
  on public.family_children (family_id, parent_id);

alter table public.family_children enable row level security;
grant select, insert, delete on public.family_children to authenticated;

create policy "Family members can read children"
  on public.family_children for select to authenticated
  using (public.is_family_member(family_id));

create policy "Members can add their own children"
  on public.family_children for insert to authenticated
  with check (parent_id = (select auth.uid()) and public.is_family_member(family_id));

create policy "Members can remove their own children"
  on public.family_children for delete to authenticated
  using (parent_id = (select auth.uid()) and public.is_family_member(family_id));

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'family_children'
    ) then
    alter publication supabase_realtime add table public.family_children;
  end if;
end;
$$;
