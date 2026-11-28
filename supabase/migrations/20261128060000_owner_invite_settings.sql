create table public.family_invite_secrets (
  family_id uuid primary key references public.families (id) on delete cascade,
  invite_code text not null unique,
  invite_code_expires_at timestamptz not null
);

insert into public.family_invite_secrets (family_id, invite_code, invite_code_expires_at)
select id, invite_code, invite_code_expires_at from public.families;

alter table public.family_invite_secrets enable row level security;
grant select on public.family_invite_secrets to authenticated;
create policy "Family owners can read invite secrets"
  on public.family_invite_secrets for select to authenticated
  using (public.is_family_owner(family_id));

alter table public.families drop column invite_code, drop column invite_code_expires_at;

create or replace function public.create_family(p_name text, p_year integer)
returns table (family_id uuid, name text, year integer, invite_code text, invite_code_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family public.families%rowtype;
  v_invite public.family_invite_secrets%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to create a family.';
  end if;
  if pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 100 then
    raise exception 'Family name must be between 1 and 100 characters.';
  end if;
  if p_year not between 2000 and 9998 then
    raise exception 'Family year must be between 2000 and 9998.';
  end if;

  insert into public.families (name, year, created_by)
  values (pg_catalog.btrim(p_name), p_year, v_user_id)
  returning * into v_family;
  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, v_user_id, 'owner');
  insert into public.family_invite_secrets (family_id, invite_code, invite_code_expires_at)
  values (
    v_family.id,
    pg_catalog.upper(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '')),
    pg_catalog.make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')
  ) returning * into v_invite;

  return query select v_family.id, v_family.name, v_family.year,
    v_invite.invite_code, v_invite.invite_code_expires_at;
end;
$$;

create or replace function public.join_family(p_invite_code text)
returns table (family_id uuid, name text, year integer, invite_code text, invite_code_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_family_id uuid;
  v_family public.families%rowtype;
  v_invite public.family_invite_secrets%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to join a family.';
  end if;
  select secret.family_id into v_family_id
  from public.family_invite_secrets as secret
  where secret.invite_code = pg_catalog.upper(pg_catalog.btrim(p_invite_code));
  if not found then
    raise exception 'That family invite code is invalid or has expired.';
  end if;

  select * into v_family from public.families as family
  where family.id = v_family_id for update;
  if not found then
    raise exception 'That family invite code is invalid or has expired.';
  end if;
  select * into v_invite from public.family_invite_secrets as secret
  where secret.family_id = v_family_id
    and secret.invite_code = pg_catalog.upper(pg_catalog.btrim(p_invite_code))
    and secret.invite_code_expires_at > pg_catalog.now()
  for update;
  if not found then
    raise exception 'That family invite code is invalid or has expired.';
  end if;

  select auth_user.email into v_email from auth.users as auth_user
  where auth_user.id = v_user_id;
  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, v_user_id, 'member')
  on conflict on constraint family_members_pkey do nothing;
  if v_email is not null then
    update public.family_invites as invite
    set status = 'joined', joined_user_id = v_user_id
    where invite.family_id = v_family.id and invite.status = 'pending'
      and exists (
        select 1 from public.family_invite_contacts as contact
        where contact.invite_id = invite.id
          and contact.email = pg_catalog.lower(v_email)
      );
  end if;
  return query select v_family.id, v_family.name, v_family.year,
    v_invite.invite_code, v_invite.invite_code_expires_at;
end;
$$;

create or replace function public.regenerate_family_invite(p_family_id uuid)
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
  update public.family_invite_secrets
  set invite_code = pg_catalog.upper(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''))
  where family_id = p_family_id and invite_code_expires_at > pg_catalog.now()
  returning invite_code into v_code;
  if not found then
    raise exception 'This family invite has expired. Update its expiration before regenerating it.';
  end if;
  return v_code;
end;
$$;

create function public.set_family_invite_expiry(p_family_id uuid, p_expires_on date)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer;
  v_expiry timestamptz;
begin
  select family.year into v_year from public.families as family
  where family.id = p_family_id for update;
  if not found or not public.is_family_owner(p_family_id) then
    raise exception 'Only the family owner can change invite expiration.';
  end if;
  if p_expires_on is null
    or p_expires_on < (pg_catalog.now() at time zone 'UTC')::date
    or p_expires_on > pg_catalog.make_date(v_year, 12, 31) then
    raise exception 'Choose a future expiration date no later than the end of the family year.';
  end if;
  v_expiry := (p_expires_on::timestamp + interval '1 day') at time zone 'UTC';
  update public.family_invite_secrets
  set invite_code_expires_at = v_expiry
  where family_id = p_family_id;
  if not found then
    raise exception 'Family invite not found.';
  end if;
  return v_expiry;
end;
$$;

revoke all on function public.set_family_invite_expiry(uuid, date) from public, anon;
grant execute on function public.set_family_invite_expiry(uuid, date) to authenticated;
