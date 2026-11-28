alter table public.profiles
  add column avatar_photo text
  check (
    avatar_photo is null or (
      length(avatar_photo) <= 120000
      and avatar_photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
    )
  );

grant update (avatar_photo) on public.profiles to authenticated;

create function public.check_family_name_length()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.char_length(pg_catalog.btrim(new.name)) > 24 then
    raise exception 'Family name must be 24 characters or fewer.';
  end if;
  return new;
end;
$$;

create trigger family_name_length
  before insert or update of name on public.families
  for each row execute function public.check_family_name_length();
