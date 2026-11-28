alter table public.families
  add column custom_tree_hue integer,
  add column custom_tree_accent_hue integer,
  add constraint families_unsaved_tree_theme_check check (
    (custom_tree_hue is null and custom_tree_accent_hue is null)
    or (
      custom_tree_theme_id is null
      and custom_tree_hue is not null
      and custom_tree_hue between 0 and 359
      and custom_tree_accent_hue is not null
      and custom_tree_accent_hue between 0 and 359
    )
  );

grant update (custom_tree_hue, custom_tree_accent_hue)
  on public.families to authenticated;

create function public.link_saved_active_tree_theme()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.families
  set custom_tree_theme_id = new.id,
      custom_tree_hue = null,
      custom_tree_accent_hue = null
  where id = new.family_id
    and custom_tree_hue = new.hue
    and custom_tree_accent_hue = new.accent_hue;
  return new;
end;
$$;

create trigger link_saved_active_tree_theme
  after insert on public.family_tree_custom_themes
  for each row execute function public.link_saved_active_tree_theme();
