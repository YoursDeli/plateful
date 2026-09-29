-- Plateful — catering event types trimmed (client, 2026-09-29):
-- form offers Wedding, Corporate event, Funeral, Family gathering, Other.
-- "Funeral / remembrance" is renamed "Funeral". Birthday / Religious event
-- stay valid in the database only so any earlier requests remain intact.

update public.catering_requests set event_type = 'Funeral' where event_type = 'Funeral / remembrance';

alter table public.catering_requests drop constraint if exists catering_requests_event_type_check;
alter table public.catering_requests add constraint catering_requests_event_type_check
  check (event_type in (
    'Wedding', 'Corporate event', 'Funeral', 'Family gathering', 'Other',
    'Birthday', 'Religious event'  -- legacy values, no longer offered
  ));

-- Starter FAQ answer mentioned birthdays; update it only if unedited.
update public.faqs
   set answer = 'Yes. We cater for weddings, corporate events, family gatherings and more. Fill in the Events & Catering form and we''ll get back to you with a quote.'
 where question = 'Do you cook for events?'
   and answer = 'Yes. We cater for weddings, birthdays, corporate events and more. Fill in the Events & Catering form and we''ll get back to you with a quote.';
