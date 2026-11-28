-- Serialize joining, deleting, and rotating an invite on the family row.
create or replace function public.join_family(p_invite_code text)
returns table (
  family_id uuid,
  name text,
  year integer,
  invite_code text,
  invite_code_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_family public.families%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to join a family.';
  end if;

  select auth_user.email into v_email
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  select * into v_family
  from public.families as family
  where family.invite_code = pg_catalog.upper(pg_catalog.btrim(p_invite_code))
    and family.invite_code_expires_at > pg_catalog.now()
  for update;

  if not found then
    raise exception 'That family invite code is invalid or has expired.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, v_user_id, 'member')
  on conflict on constraint family_members_pkey do nothing;

  if v_email is not null then
    update public.family_invites as invite
    set status = 'joined', joined_user_id = v_user_id
    where invite.family_id = v_family.id
      and invite.status = 'pending'
      and exists (
        select 1 from public.family_invite_contacts as contact
        where contact.invite_id = invite.id
          and contact.email = pg_catalog.lower(v_email)
      );
  end if;

  return query select v_family.id, v_family.name, v_family.year,
    v_family.invite_code, v_family.invite_code_expires_at;
end;
$$;

-- Direct DELETE previously allowed owners to delete families with members.
revoke delete on public.families from authenticated;
drop policy "Family owners can delete their families" on public.families;

create function public.delete_empty_family(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.families where id = p_family_id for update;
  if not found or not public.is_family_owner(p_family_id) then
    raise exception 'Only the family owner can delete this family.';
  end if;
  if exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id <> auth.uid()
  ) then
    raise exception 'A family can only be deleted when the owner is the only member.';
  end if;
  delete from public.families where id = p_family_id;
end;
$$;

create function public.regenerate_family_invite(p_family_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  perform 1 from public.families where id = p_family_id for update;
  if not found or not public.is_family_owner(p_family_id) then
    raise exception 'Only the family owner can regenerate the invite.';
  end if;
  update public.families
  set invite_code = pg_catalog.upper(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''))
  where id = p_family_id and invite_code_expires_at > pg_catalog.now()
  returning invite_code into v_code;
  if not found then
    raise exception 'This family invite has expired and cannot be regenerated.';
  end if;
  return v_code;
end;
$$;

revoke all on function public.delete_empty_family(uuid) from public, anon;
revoke all on function public.regenerate_family_invite(uuid) from public, anon;
grant execute on function public.delete_empty_family(uuid) to authenticated;
grant execute on function public.regenerate_family_invite(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'families'
    ) then
    alter publication supabase_realtime add table public.families;
  end if;
end;
$$;
