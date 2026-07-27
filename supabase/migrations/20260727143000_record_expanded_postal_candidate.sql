begin;

update public.outreach_settings
set postal_address_candidate = 'Creek Hollow Ave, Zachary, LA 70791',
    sending_enabled = false
where singleton = true;

commit;
