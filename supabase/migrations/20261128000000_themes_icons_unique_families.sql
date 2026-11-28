-- Ornament icon chosen by each member (color already lives in avatar_color).
alter table public.profiles
  add column avatar_icon text not null default 'gift'
    check (avatar_icon in (
      'gift', 'bell', 'candy-cane', 'snowflake', 'cookie', 'gem',
      'rocket', 'puzzle', 'candy', 'heart', 'star'
    ));

grant update (avatar_icon) on public.profiles to authenticated;

-- Tree color scheme, chosen by the family owner.
alter table public.families
  add column tree_theme text not null default 'classic'
    check (tree_theme in ('classic', 'tokyo-night', 'mist', 'amber'));

grant update (tree_theme) on public.families to authenticated;

-- A family is unique by (case-insensitive) name and year.
create unique index families_name_year_key
  on public.families (lower(btrim(name)), year);
