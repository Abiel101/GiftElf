-- Invite-only team-ups
--
-- A team-up is only visible to the family members who were invited to it.
-- team_up_members.confirmed_at is NULL while an invite is pending and set once
-- the invitee confirms. The creator is confirmed automatically. The person who
-- wants the gift can never see, join or be invited to its team-up.

-- 1. Schema ---------------------------------------------------------------

alter table public.team_up_members
  add column confirmed_at timestamptz;

-- Existing participants were already in the team-up, so treat them as confirmed.
update public.team_up_members
set confirmed_at = joined_at
where confirmed_at is null;

-- 2. Helpers --------------------------------------------------------------

-- True only for confirmed members (can invite others and complete the team-up).
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
      and member.confirmed_at is not null
  );
$$;

-- True for anyone with a member row, pending or confirmed (can see the team-up).
create or replace function public.is_team_up_invitee(p_team_up_id uuid)
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

-- 3. Functions ------------------------------------------------------------

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
  if exists (select 1 from public.team_ups as team_up where team_up.gift_id = p_gift_id) then
    raise exception 'A team-up already exists for this gift. Ask a member to invite you.';
  end if;

  insert into public.team_ups (family_id, gift_id, created_by)
  values (v_family_id, p_gift_id, v_user_id)
  returning id into v_team_up_id;

  insert into public.team_up_members (team_up_id, user_id, confirmed_at)
  values (v_team_up_id, v_user_id, pg_catalog.now());

  return v_team_up_id;
end;
$$;

create or replace function public.invite_to_team_up(
  p_team_up_id uuid,
  p_user_id uuid
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
  if not public.is_team_up_participant(p_team_up_id) then
    raise exception 'Only confirmed team-up members can invite others.';
  end if;
  if p_user_id = v_owner_id then
    raise exception 'The person who wants the gift cannot be invited.';
  end if;
  if not exists (
    select 1
    from public.family_members as member
    where member.family_id = v_family_id
      and member.user_id = p_user_id
  ) then
    raise exception 'You can only invite members of this family.';
  end if;
  if exists (select 1 from public.claims as claim where claim.gift_id = v_gift_id) then
    raise exception 'This gift has already been claimed.';
  end if;

  insert into public.team_up_members (team_up_id, user_id, confirmed_at)
  values (p_team_up_id, p_user_id, null)
  on conflict (team_up_id, user_id) do nothing;
end;
$$;

create or replace function public.confirm_team_up(p_team_up_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.team_up_members as member
  set confirmed_at = pg_catalog.now()
  from public.team_ups as team_up
  where member.team_up_id = p_team_up_id
    and member.user_id = (select auth.uid())
    and member.confirmed_at is null
    and team_up.id = member.team_up_id
    and team_up.status = 'open';

  if not found then
    raise exception 'You have no pending invitation to that open team-up.';
  end if;
end;
$$;

-- Joining is replaced by invite + confirm.
drop function public.join_team_up(uuid, numeric);

-- 4. Permissions ----------------------------------------------------------

revoke all on function public.is_team_up_invitee(uuid) from public, anon;
revoke all on function public.invite_to_team_up(uuid, uuid) from public, anon;
revoke all on function public.confirm_team_up(uuid) from public, anon;
grant execute on function public.is_team_up_invitee(uuid) to authenticated;
grant execute on function public.invite_to_team_up(uuid, uuid) to authenticated;
grant execute on function public.confirm_team_up(uuid) to authenticated;

-- 5. Row-level security ---------------------------------------------------

drop policy "Members can see team-ups for other members' gifts" on public.team_ups;
drop policy "Family members can see team-up members" on public.team_up_members;

create policy "Invitees can see their team-ups"
  on public.team_ups for select to authenticated
  using (public.is_team_up_invitee(id));

create policy "Invitees can see who else is on their team-up"
  on public.team_up_members for select to authenticated
  using (public.is_team_up_invitee(team_up_id));
