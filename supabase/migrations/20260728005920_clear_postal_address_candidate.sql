update public.outreach_settings
set postal_address_candidate = null,
    sending_enabled = false
where singleton = true;
