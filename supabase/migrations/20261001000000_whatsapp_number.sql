-- Plateful — Build Order step 8a: restaurant WhatsApp number for the
-- "Message us on WhatsApp" button (order tracking page; footer in step 11).
-- International digits only, no "+" (the wa.me link format), e.g. 2348031234567.
-- NULL = button hidden.

alter table public.site_settings
  add column whatsapp_number text
    check (whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$');

grant update (whatsapp_number) on public.site_settings to authenticated;
