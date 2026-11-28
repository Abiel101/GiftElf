alter table public.profile_private
  add column app_theme text not null default 'family'
    check (app_theme in ('family', 'classic', 'tokyo-night', 'mist', 'amber', 'cyberpunk'));

grant update (app_theme) on public.profile_private to authenticated;
