-- Keep the durable order-draft constraints aligned with the public Brief form.
-- Main goal remains required; style direction and content status are optional.

alter table public.order_drafts
  drop constraint if exists order_drafts_main_goal_check,
  drop constraint if exists order_drafts_style_direction_check,
  drop constraint if exists order_drafts_content_status_check;

alter table public.order_drafts
  add constraint order_drafts_main_goal_check
    check (char_length(btrim(main_goal)) between 2 and 4000),
  add constraint order_drafts_style_direction_check
    check (char_length(style_direction) <= 4000),
  add constraint order_drafts_content_status_check
    check (char_length(content_status) <= 120);
