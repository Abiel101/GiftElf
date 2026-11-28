create table public.wish_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (id, family_id, owner_id)
);

alter table public.gifts add column list_id uuid;

insert into public.wish_lists (family_id, owner_id, name)
select distinct family_id, owner_id, 'Wish list'
from public.gifts;

update public.gifts as gift
set list_id = list.id
from public.wish_lists as list
where list.family_id = gift.family_id and list.owner_id = gift.owner_id;

alter table public.gifts
  alter column list_id set not null,
  add constraint gifts_list_owner_family_fkey
    foreign key (list_id, family_id, owner_id)
    references public.wish_lists (id, family_id, owner_id);

create index wish_lists_family_owner_idx on public.wish_lists (family_id, owner_id);
create index gifts_list_id_idx on public.gifts (list_id);

alter table public.wish_lists enable row level security;
grant select, insert, update, delete on public.wish_lists to authenticated;

create policy "Family members can read wish lists"
  on public.wish_lists for select to authenticated
  using (public.is_family_member(family_id));

create policy "Members can create their own wish lists"
  on public.wish_lists for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_family_member(family_id));

create policy "Members can update their own wish lists"
  on public.wish_lists for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_family_member(family_id))
  with check (owner_id = (select auth.uid()) and public.is_family_member(family_id));

create policy "Members can delete their own wish lists"
  on public.wish_lists for delete to authenticated
  using (owner_id = (select auth.uid()) and public.is_family_member(family_id));

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'wish_lists'
    ) then
    alter publication supabase_realtime add table public.wish_lists;
  end if;
end;
$$;
