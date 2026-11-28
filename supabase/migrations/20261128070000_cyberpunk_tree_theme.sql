alter table public.families
  drop constraint families_tree_theme_check;

alter table public.families
  add constraint families_tree_theme_check
  check (tree_theme in ('classic', 'tokyo-night', 'mist', 'amber', 'cyberpunk'));
