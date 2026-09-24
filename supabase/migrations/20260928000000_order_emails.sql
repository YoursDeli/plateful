-- Plateful — Build Order step 7: transactional order emails (Brevo)

-- Where "New order" alerts go (admin-editable; blank = BREVO_SENDER_EMAIL).
alter table public.site_settings
  add column order_notification_email text
    check (order_notification_email is null
           or order_notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

grant update (order_notification_email) on public.site_settings to authenticated;

-- Record of what was actually sent (set by server code via the service role).
-- Also the basis for a future "resend" / retry tool.
alter table public.orders
  add column confirmation_emailed_at timestamptz,
  add column vendor_emailed_at timestamptz;
