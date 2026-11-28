alter table public.claims
  add column purchased_at timestamptz,
  add column purchase_proof_url text,
  add constraint claims_purchase_proof_check check (
    (purchase_proof_url is null or (
      char_length(purchase_proof_url) <= 2048
      and purchase_proof_url ~* '^https://[^/?#[:space:]]+[^[:space:]]*$'
    ))
    and (purchase_proof_url is null or purchased_at is not null)
  );

update public.claims as claim
set purchased_at = team_up.funded_at
from public.team_ups as team_up
where team_up.gift_id = claim.gift_id
  and team_up.status = 'funded';

create function public.confirm_gift_purchase(
  p_gift_id uuid,
  p_purchase_proof_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proof text := pg_catalog.btrim(p_purchase_proof_url);
begin
  if v_proof is null or pg_catalog.char_length(v_proof) > 2048
     or v_proof !~* '^https://[^/?#[:space:]]+[^[:space:]]*$' then
    raise exception 'Provide a valid HTTPS purchase-proof link.';
  end if;

  update public.claims as claim
  set purchased_at = pg_catalog.now(), purchase_proof_url = v_proof
  where claim.gift_id = p_gift_id
    and claim.claimed_by = (select auth.uid())
    and claim.purchased_at is null
    and public.is_family_member(claim.family_id)
    and not exists (
      select 1 from public.team_ups as team_up
      where team_up.gift_id = claim.gift_id
    );

  if not found then
    raise exception 'You can only confirm your own unpurchased individual claim.';
  end if;
end;
$$;

revoke all on function public.confirm_gift_purchase(uuid, text) from public, anon;
grant execute on function public.confirm_gift_purchase(uuid, text) to authenticated;

revoke delete on public.claims from authenticated;
drop policy "Members can release their own claims" on public.claims;

create or replace function public.release_gift_claim(p_gift_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
begin
  select claim.family_id into v_family_id
  from public.claims as claim
  where claim.gift_id = p_gift_id
    and claim.claimed_by = (select auth.uid())
  for update;

  if not found or not public.is_family_member(v_family_id) then
    raise exception 'You have no claim on that gift in your family.';
  end if;
  if exists (
    select 1 from public.team_ups as team_up
    where team_up.gift_id = p_gift_id and team_up.status = 'funded'
  ) then
    raise exception 'A completed team-up claim cannot be released.';
  end if;
  delete from public.claims where gift_id = p_gift_id;
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
  v_proof text := pg_catalog.btrim(p_purchase_proof_url);
  v_purchased_at timestamptz := pg_catalog.now();
begin
  if v_proof is null or pg_catalog.char_length(v_proof) > 2048
     or v_proof !~* '^https://[^/?#[:space:]]+[^[:space:]]*$' then
    raise exception 'Provide a valid HTTPS purchase-proof link.';
  end if;

  select team_up.family_id, team_up.gift_id, gift.owner_id
  into v_family_id, v_gift_id, v_owner_id
  from public.team_ups as team_up
  join public.gifts as gift on gift.id = team_up.gift_id
  where team_up.id = p_team_up_id
    and team_up.status = 'open'
  for update of team_up, gift;

  if not found then
    raise exception 'That team-up is unavailable or you cannot complete it.';
  end if;
  if v_user_id is null or v_owner_id = v_user_id
     or not public.is_family_member(v_family_id)
     or not public.is_team_up_participant(p_team_up_id) then
    raise exception 'That team-up is unavailable or you cannot complete it.';
  end if;

  update public.team_ups
  set status = 'funded', purchase_proof_url = v_proof, funded_at = v_purchased_at
  where id = p_team_up_id;

  insert into public.claims (gift_id, family_id, claimed_by, purchased_at)
  values (v_gift_id, v_family_id, v_user_id, v_purchased_at);
end;
$$;
