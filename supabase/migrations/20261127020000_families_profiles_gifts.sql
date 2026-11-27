create type public.gift_category as enum ('want', 'need', 'gift_card', 'nice_to_have');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_color text not null default '#ff4f58'
    check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  favorite_items text[] not null default '{}',
  things_they_like text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  birth_year integer check (birth_year between 1900 and 9998),
  share_age boolean not null default false
);

create or replace function public.validate_private_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_year is not null
    and new.birth_year > pg_catalog.date_part('year', current_date)::integer then
    raise exception 'Birth year cannot be in the future.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_private_profile() from public, anon, authenticated;

create trigger validate_private_profile_before_write
  before insert or update on public.profile_private
  for each row execute function public.validate_private_profile();

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  year integer not null check (year between 2000 and 9998),
  invite_code text not null unique
    default upper(replace(gen_random_uuid()::text, '-', '')),
  invite_code_expires_at timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (id, year)
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  joined_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'joined')),
  created_at timestamptz not null default now(),
  unique (family_id, id),
  unique (family_id, joined_user_id)
);

create table public.family_invite_contacts (
  invite_id uuid primary key,
  family_id uuid not null,
  email text not null check (email = lower(btrim(email))),
  foreign key (family_id, invite_id)
    references public.family_invites (family_id, id)
    on delete cascade
);

create unique index family_invite_contacts_family_email_key
  on public.family_invite_contacts (family_id, email);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  url text check (url is null or url ~* '^https?://'),
  store text,
  price numeric(10, 2) check (price is null or price >= 0),
  category public.gift_category not null default 'want',
  image_url text check (
    image_url is null
    or image_url ~* '^https?://'
    or image_url ~ '^/img/[A-Za-z0-9_.-]+$'
  ),
  notes text,
  created_at timestamptz not null default now(),
  unique (family_id, id)
);

create table public.claims (
  gift_id uuid primary key,
  family_id uuid not null,
  claimed_by uuid not null references public.profiles (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  foreign key (family_id, gift_id)
    references public.gifts (family_id, id)
    on delete cascade
);

create table public.team_ups (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  gift_id uuid not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'funded')),
  purchase_proof_url text check (
    purchase_proof_url is null or purchase_proof_url ~* '^https?://'
  ),
  created_at timestamptz not null default now(),
  funded_at timestamptz,
  foreign key (family_id, gift_id)
    references public.gifts (family_id, id)
    on delete cascade,
  check (
    (status = 'open' and funded_at is null)
    or (status = 'funded' and funded_at is not null and purchase_proof_url is not null)
  ),
  unique (family_id, id)
);

create table public.team_up_members (
  team_up_id uuid not null references public.team_ups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pledge numeric(10, 2) check (pledge is null or pledge >= 0),
  joined_at timestamptz not null default now(),
  primary key (team_up_id, user_id)
);

create index gifts_family_owner_category_idx
  on public.gifts (family_id, owner_id, category);
create index gifts_price_idx on public.gifts (price);
create index families_invite_code_idx on public.families (invite_code);
create index family_members_user_id_idx on public.family_members (user_id);
create index family_invites_family_status_idx
  on public.family_invites (family_id, status);
create index team_ups_family_status_idx
  on public.team_ups (family_id, status);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), '');
  if v_display_name is null then
    v_display_name := nullif(
      pg_catalog.split_part(coalesce(new.email, ''), '@', 1),
      ''
    );
  end if;
  if v_display_name is null then
    v_display_name := 'New member';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  insert into public.profile_private (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select
  auth_user.id,
  coalesce(
    nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
    nullif(pg_catalog.split_part(coalesce(auth_user.email, ''), '@', 1), ''),
    'New member'
  )
from auth.users as auth_user
on conflict (id) do nothing;

insert into public.profile_private (user_id)
select auth_user.id
from auth.users as auth_user
on conflict (user_id) do nothing;

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members as member
    where member.family_id = p_family_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members as member
    where member.family_id = p_family_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  );
$$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id = (select auth.uid())
    or exists (
      select 1
      from public.family_members as viewer
      join public.family_members as subject
        on subject.family_id = viewer.family_id
      where viewer.user_id = (select auth.uid())
        and subject.user_id = p_profile_id
    );
$$;

create or replace function public.get_family_member_ages(p_family_id uuid)
returns table (user_id uuid, age_label text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'You must be a family member to view family ages.';
  end if;

  return query
  select
    member.user_id,
    case
      when private_profile.share_age is not true or private_profile.birth_year is null then null
      when pg_catalog.date_part('year', current_date)::integer
        - private_profile.birth_year between 21 and 24
        then 'Older than 20, younger than 25'
      when pg_catalog.date_part('year', current_date)::integer
        - private_profile.birth_year < 20
        then 'Under 20'
      else
        'In their ' ||
        (((pg_catalog.date_part('year', current_date)::integer
          - private_profile.birth_year) / 10) * 10)::text ||
        's'
    end
  from public.family_members as member
  left join public.profile_private as private_profile
    on private_profile.user_id = member.user_id
  where member.family_id = p_family_id;
end;
$$;

create or replace function public.is_team_up_participant(p_team_up_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_up_members as member
    where member.team_up_id = p_team_up_id
      and member.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_family_member(uuid) from public, anon;
revoke all on function public.is_family_owner(uuid) from public, anon;
revoke all on function public.can_view_profile(uuid) from public, anon;
revoke all on function public.get_family_member_ages(uuid) from public, anon;
revoke all on function public.is_team_up_participant(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.get_family_member_ages(uuid) to authenticated;
grant execute on function public.is_team_up_participant(uuid) to authenticated;

create or replace function public.create_family(p_name text, p_year integer)
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
  v_family public.families%rowtype;
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

  insert into public.families (
    name,
    year,
    invite_code_expires_at,
    created_by
  )
  values (
    pg_catalog.btrim(p_name),
    p_year,
    pg_catalog.make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC'),
    v_user_id
  )
  returning * into v_family;

  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, v_user_id, 'owner');

  return query
  select
    v_family.id,
    v_family.name,
    v_family.year,
    v_family.invite_code,
    v_family.invite_code_expires_at;
end;
$$;

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

  select auth_user.email
  into v_email
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  select *
  into v_family
  from public.families as family
  where family.invite_code = pg_catalog.upper(pg_catalog.btrim(p_invite_code))
    and family.invite_code_expires_at > pg_catalog.now();

  if not found then
    raise exception 'That family invite code is invalid or has expired.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, v_user_id, 'member')
  on conflict (family_id, user_id) do nothing;

  if v_email is not null then
    update public.family_invites as invite
    set status = 'joined',
        joined_user_id = v_user_id
    where invite.family_id = v_family.id
      and invite.status = 'pending'
      and exists (
        select 1
        from public.family_invite_contacts as contact
        where contact.invite_id = invite.id
          and contact.email = pg_catalog.lower(v_email)
      );
  end if;

  return query
  select
    v_family.id,
    v_family.name,
    v_family.year,
    v_family.invite_code,
    v_family.invite_code_expires_at;
end;
$$;

create or replace function public.create_family_invite(
  p_family_id uuid,
  p_display_name text,
  p_email text
)
returns table (invite_id uuid, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.family_invites%rowtype;
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
begin
  if not public.is_family_owner(p_family_id) then
    raise exception 'Only the family owner can invite members.';
  end if;
  if pg_catalog.char_length(pg_catalog.btrim(p_display_name)) not between 1 and 80 then
    raise exception 'Invite name must be between 1 and 80 characters.';
  end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address for the invite.';
  end if;

  insert into public.family_invites (family_id, display_name, invited_by)
  values (p_family_id, pg_catalog.btrim(p_display_name), (select auth.uid()))
  returning * into v_invite;

  insert into public.family_invite_contacts (invite_id, family_id, email)
  values (v_invite.id, p_family_id, v_email);

  return query select v_invite.id, v_invite.display_name;
end;
$$;

create or replace function public.claim_gift(p_gift_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_owner_id uuid;
begin
  select gift.family_id, gift.owner_id
  into v_family_id, v_owner_id
  from public.gifts as gift
  where gift.id = p_gift_id
  for update;

  if not found then
    raise exception 'That gift could not be found.';
  end if;
  if v_user_id is null or not public.is_family_member(v_family_id) then
    raise exception 'You must be a family member to claim this gift.';
  end if;
  if v_owner_id = v_user_id then
    raise exception 'You cannot claim your own gift.';
  end if;
  if exists (
    select 1
    from public.team_ups as team_up
    where team_up.gift_id = p_gift_id
  ) then
    raise exception 'This gift is part of a team-up.';
  end if;

  insert into public.claims (gift_id, family_id, claimed_by)
  values (p_gift_id, v_family_id, v_user_id);
end;
$$;

create or replace function public.release_gift_claim(p_gift_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.claims as claim
  where claim.gift_id = p_gift_id
    and claim.claimed_by = (select auth.uid());

  if not found then
    raise exception 'You do not have a claim on this gift.';
  end if;
end;
$$;

create or replace function public.create_team_up(p_gift_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_owner_id uuid;
  v_team_up_id uuid;
begin
  select gift.family_id, gift.owner_id
  into v_family_id, v_owner_id
  from public.gifts as gift
  where gift.id = p_gift_id
  for update;

  if not found then
    raise exception 'That gift could not be found.';
  end if;
  if v_user_id is null or not public.is_family_member(v_family_id) then
    raise exception 'You must be a family member to start a team-up.';
  end if;
  if v_owner_id = v_user_id then
    raise exception 'You cannot team up on your own gift.';
  end if;
  if not exists (
    select 1
    from public.gifts as gift
    where gift.id = p_gift_id
      and gift.price >= 60
  ) then
    raise exception 'Team-ups are available for gifts priced at $60 or more.';
  end if;
  if exists (select 1 from public.claims as claim where claim.gift_id = p_gift_id) then
    raise exception 'This gift has already been claimed.';
  end if;

  insert into public.team_ups (family_id, gift_id, created_by)
  values (v_family_id, p_gift_id, v_user_id)
  returning id into v_team_up_id;

  insert into public.team_up_members (team_up_id, user_id)
  values (v_team_up_id, v_user_id);

  return v_team_up_id;
end;
$$;

create or replace function public.join_team_up(p_team_up_id uuid, p_pledge numeric default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_owner_id uuid;
  v_gift_id uuid;
begin
  select team_up.family_id, team_up.gift_id, gift.owner_id
  into v_family_id, v_gift_id, v_owner_id
  from public.team_ups as team_up
  join public.gifts as gift on gift.id = team_up.gift_id
  where team_up.id = p_team_up_id
    and team_up.status = 'open'
  for update of team_up, gift;

  if not found then
    raise exception 'That team-up is not open.';
  end if;
  if not public.is_family_member(v_family_id) then
    raise exception 'You must be a family member to join this team-up.';
  end if;
  if v_owner_id = (select auth.uid()) then
    raise exception 'The person who wants the gift cannot join its team-up.';
  end if;
  if exists (select 1 from public.claims as claim where claim.gift_id = v_gift_id) then
    raise exception 'This gift has already been claimed.';
  end if;

  insert into public.team_up_members (team_up_id, user_id, pledge)
  values (p_team_up_id, (select auth.uid()), p_pledge);
end;
$$;

create or replace function public.complete_team_up(
  p_team_up_id uuid,
  p_purchase_proof_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_gift_id uuid;
  v_owner_id uuid;
  v_user_id uuid := auth.uid();
begin
  if p_purchase_proof_url !~* '^https?://' then
    raise exception 'Provide an http or https purchase-proof link.';
  end if;

  select team_up.family_id, team_up.gift_id, gift.owner_id
  into v_family_id, v_gift_id, v_owner_id
  from public.team_ups as team_up
  join public.gifts as gift on gift.id = team_up.gift_id
  where team_up.id = p_team_up_id
    and team_up.status = 'open'
  for update of team_up, gift;

  if not found then
    raise exception 'That team-up is not open.';
  end if;
  if v_owner_id = v_user_id then
    raise exception 'The gift owner cannot complete its team-up.';
  end if;
  if not public.is_team_up_participant(p_team_up_id) then
    raise exception 'Only a team-up participant can complete it.';
  end if;

  update public.team_ups
  set status = 'funded',
      purchase_proof_url = p_purchase_proof_url,
      funded_at = pg_catalog.now()
  where id = p_team_up_id;

  insert into public.claims (gift_id, family_id, claimed_by)
  values (v_gift_id, v_family_id, v_user_id);
end;
$$;

revoke all on function public.create_family(text, integer) from public, anon;
revoke all on function public.join_family(text) from public, anon;
revoke all on function public.create_family_invite(uuid, text, text) from public, anon;
revoke all on function public.claim_gift(uuid) from public, anon;
revoke all on function public.release_gift_claim(uuid) from public, anon;
revoke all on function public.create_team_up(uuid) from public, anon;
revoke all on function public.join_team_up(uuid, numeric) from public, anon;
revoke all on function public.complete_team_up(uuid, text) from public, anon;
grant execute on function public.create_family(text, integer) to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.create_family_invite(uuid, text, text) to authenticated;
grant execute on function public.claim_gift(uuid) to authenticated;
grant execute on function public.release_gift_claim(uuid) to authenticated;
grant execute on function public.create_team_up(uuid) to authenticated;
grant execute on function public.join_team_up(uuid, numeric) to authenticated;
grant execute on function public.complete_team_up(uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.family_invite_contacts enable row level security;
alter table public.gifts enable row level security;
alter table public.claims enable row level security;
alter table public.team_ups enable row level security;
alter table public.team_up_members enable row level security;

revoke all on public.profiles, public.profile_private, public.families,
  public.family_members, public.family_invites, public.family_invite_contacts,
  public.gifts, public.claims, public.team_ups, public.team_up_members
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_color, favorite_items, things_they_like)
  on public.profiles to authenticated;
grant select, update (birth_year, share_age) on public.profile_private to authenticated;
grant select, delete on public.families to authenticated;
grant update (name) on public.families to authenticated;
grant select on public.family_members, public.family_invites to authenticated;
grant delete on public.family_invites to authenticated;
grant select, insert, update, delete on public.gifts to authenticated;
grant select, delete on public.claims to authenticated;
grant select on public.team_ups, public.team_up_members to authenticated;

create policy "Family members can read shared profiles"
  on public.profiles for select to authenticated
  using (public.can_view_profile(id));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users can read their private profile"
  on public.profile_private for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can update their date of birth"
  on public.profile_private for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Family members can read their families"
  on public.families for select to authenticated
  using (public.is_family_member(id));

create policy "Family owners can update family details"
  on public.families for update to authenticated
  using (public.is_family_owner(id))
  with check (public.is_family_owner(id));

create policy "Family owners can delete their families"
  on public.families for delete to authenticated
  using (public.is_family_owner(id));

create policy "Family members can read the member roster"
  on public.family_members for select to authenticated
  using (public.is_family_member(family_id));

create policy "Family members can read pending invites"
  on public.family_invites for select to authenticated
  using (public.is_family_member(family_id));

create policy "Family owners can remove pending invites"
  on public.family_invites for delete to authenticated
  using (public.is_family_owner(family_id));

create policy "Family members can read wish lists"
  on public.gifts for select to authenticated
  using (public.is_family_member(family_id));

create policy "Members can add gifts to their own lists"
  on public.gifts for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_family_member(family_id)
  );

create policy "Gift owners can update their gifts"
  on public.gifts for update to authenticated
  using (
    owner_id = (select auth.uid())
    and public.is_family_member(family_id)
  )
  with check (
    owner_id = (select auth.uid())
    and public.is_family_member(family_id)
  );

create policy "Gift owners can delete their gifts"
  on public.gifts for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and public.is_family_member(family_id)
  );

create policy "Members can see claims for other members' gifts"
  on public.claims for select to authenticated
  using (
    public.is_family_member(family_id)
    and exists (
      select 1
      from public.gifts as gift
      where gift.id = claims.gift_id
        and gift.owner_id <> (select auth.uid())
    )
  );

create policy "Members can release their own claims"
  on public.claims for delete to authenticated
  using (
    claimed_by = (select auth.uid())
    and public.is_family_member(family_id)
  );

create policy "Members can see team-ups for other members' gifts"
  on public.team_ups for select to authenticated
  using (
    public.is_family_member(family_id)
    and exists (
      select 1
      from public.gifts as gift
      where gift.id = team_ups.gift_id
        and gift.owner_id <> (select auth.uid())
    )
  );

create policy "Family members can see team-up members"
  on public.team_up_members for select to authenticated
  using (
    exists (
      select 1
      from public.team_ups as team_up
      join public.gifts as gift on gift.id = team_up.gift_id
      where team_up.id = team_up_members.team_up_id
        and public.is_family_member(team_up.family_id)
        and gift.owner_id <> (select auth.uid())
    )
  );

do $$
declare
  table_name text;
begin
  if exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) then
    foreach table_name in array array[
      'family_members',
      'family_invites',
      'gifts',
      'claims',
      'team_ups',
      'team_up_members'
    ] loop
      if not exists (
        select 1
        from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute pg_catalog.format(
          'alter publication supabase_realtime add table public.%I',
          table_name
        );
      end if;
    end loop;
  end if;
end;
$$;
