alter table public.project_intakes
  drop constraint if exists project_intakes_selected_pages_check;

alter table public.project_intakes
  add constraint project_intakes_selected_pages_check
  check (cardinality(selected_pages) between 1 and 7);

comment on constraint project_intakes_selected_pages_check on public.project_intakes is
  'Paid project intake accepts between one and seven selected page requests.';
