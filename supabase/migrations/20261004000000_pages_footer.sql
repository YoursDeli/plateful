-- Plateful — Build Order step 11: About / Terms / Privacy pages + site footer
-- docs/pages-referrals-footer.md §2–4. All text is admin-editable.
-- Page content is Markdown. "{brand}" is replaced with site_settings.brand_name
-- when rendered, so renaming the business never leaves stale copy.
-- Terms/Privacy are seeded as DRAFTS for client/legal sign-off (is_draft).

-- ---------------------------------------------------------------------------
-- Footer / contact settings (admin → Settings → Contact & footer)
-- ---------------------------------------------------------------------------
alter table public.site_settings
  add column tagline       text check (char_length(tagline) <= 120),
  add column opening_hours text check (char_length(opening_hours) <= 300),
  add column location      text check (char_length(location) <= 200),
  add column contact_phone text check (char_length(contact_phone) <= 30),
  add column contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column instagram_url text check (instagram_url is null or instagram_url ~ '^https://'),
  add column tiktok_url    text check (tiktok_url is null or tiktok_url ~ '^https://'),
  add column facebook_url  text check (facebook_url is null or facebook_url ~ '^https://'),
  add column x_url         text check (x_url is null or x_url ~ '^https://');

grant update (tagline, opening_hours, location, contact_phone, contact_email,
              instagram_url, tiktok_url, facebook_url, x_url)
  on public.site_settings to authenticated;

update public.site_settings set
  tagline       = 'Good food, made with care.',
  opening_hours = 'Mon–Sat: 10am – 9pm' || chr(10) || 'Sun: Closed',
  location      = 'Warri, Delta State',
  contact_phone = '+234 816 269 4737',
  tiktok_url    = 'https://www.tiktok.com/@deliciouslyyours1'
where id = 1;

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
create table public.pages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug in ('about', 'terms', 'privacy')),
  title          text not null check (char_length(trim(title)) between 1 and 120),
  content        text not null default '' check (char_length(content) <= 50000),
  chef_photo_url text,
  is_draft       boolean not null default false,
  updated_at     timestamptz not null default now()
);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

alter table public.pages enable row level security;

create policy "pages: public read"
  on public.pages for select to anon, authenticated
  using (true);

create policy "pages: staff update"
  on public.pages for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

grant select on public.pages to anon, authenticated;
grant update (title, content, chef_photo_url, is_draft) on public.pages to authenticated;
grant select, insert, update, delete on public.pages to service_role;

-- ---------------------------------------------------------------------------
-- Seed content
-- ---------------------------------------------------------------------------
insert into public.pages (slug, title, is_draft, content) values
('about', 'Meet Chef Onome Joy Ebubechukwu', false, $about$
Welcome to {brand}, where every bowl is prepared with love, passion, and a homemade touch.

Founded from a genuine love for good food, {brand} brings you delicious Nigerian soups, swallows, rice dishes, pasta, and mouth-watering proteins — carefully prepared to satisfy every craving.

For me, food is more than a meal; it's comfort, joy, and an experience worth remembering.

My goal is simple: to serve food you'll love, remember, and crave again.

Thank you for supporting my passion. I can't wait to serve you something **deliciously yours**.

— Chef Onome Joy Ebubechukwu
$about$),

('terms', 'Terms & Conditions', true, $terms$
_Last reviewed: draft for client approval. Please have these terms checked by the business owner and a legal adviser before relying on them._

These Terms & Conditions ("Terms") govern your use of the {brand} website and any order you place through it. By creating an account or placing an order, you agree to these Terms. If you do not agree, please do not use the website.

## 1. About us

{brand} is a food business based in Warri, Delta State, Nigeria. "We", "us" and "our" refer to {brand}. "You" refers to the person using the website or placing an order.

## 2. Your account

- You need an account to place an order. You can sign in with a one-time code sent to your email, or through a supported third-party sign-in provider.
- You are responsible for keeping access to your email account secure and for all activity on your {brand} account.
- Please give accurate contact and delivery details. We are not responsible for failed or late deliveries caused by incorrect details.

## 3. Menu, prices and availability

- All prices are shown in Nigerian Naira (₦) and may change at any time. The price you pay is the price confirmed at checkout.
- Dishes are subject to availability. If a dish becomes unavailable before you pay, we will ask you to remove it from your cart.
- Photos are for illustration; the presentation of your meal may vary slightly.

## 4. Placing an order and payment

- Your order is confirmed only after your payment has been successfully verified.
- Payments are processed securely by our third-party payment processor. We do not see or store your full card details.
- If your rewards (referral bonus and/or loyalty points) cover the full cost of an order, no payment is taken.

## 5. Delivery and pickup

- Delivery is available within our delivery area. A delivery fee may apply and is shown at checkout; delivery may be free above a minimum order value.
- For pickup orders, we will let you know when your order is ready to collect.
- Delivery times are estimates. Traffic, weather and other events outside our control may cause delays.

## 6. Cancellations and refunds

You may cancel a paid order within 30 minutes of payment, as long as we have not started preparing it, using the "Cancel order" option on your order page. Eligible cancellations are refunded in full to your original payment method. After 30 minutes, or once preparation has begun, orders can no longer be cancelled and are non-refundable. If we are unable to fulfil your order, we will cancel it and refund you in full.

Refunds are issued to your original payment method. The time it takes for the money to appear depends on your bank or card issuer. Any referral bonus or loyalty points used on a cancelled order are returned to your account.

## 7. Referral program

- You can share your personal referral link. When someone creates a new account with your link and their first order is delivered, you receive a referral bonus. The bonus amount is shown on your "Refer & earn" page and may change from time to time; changes do not affect bonuses already earned.
- Only new accounts created through your link qualify. You cannot refer yourself, and each person can only be referred once.
- Referral bonuses can only be used towards orders at checkout. They have no cash value and cannot be withdrawn, transferred or exchanged.
- We may withhold or remove bonuses obtained through misuse, including fake or duplicate accounts.

## 8. Loyalty points

- You earn loyalty points on the amount you actually pay for an order. Points are credited when the order is delivered or collected; cancelled orders do not earn points.
- Each point is worth ₦1 off a future order at checkout. Points have no cash value and cannot be withdrawn or transferred.
- We may change the earning rate, or pause the program, at any time. If the program is paused, your existing balance is kept.
- We may remove points obtained through misuse.

## 9. Allergies and special requests

Please tell us about allergies or dietary needs in the order notes. We take care in our kitchen, but we cannot guarantee that any dish is completely free from allergens.

## 10. Acceptable use

You agree not to misuse the website — for example by attempting to interfere with its operation, placing fraudulent orders, or abusing the referral or loyalty programs. We may suspend accounts that do.

## 11. Liability

To the extent permitted by law, our total liability for any order is limited to the amount you paid for that order. Nothing in these Terms limits any rights you have under Nigerian consumer protection law.

## 12. Changes to these Terms

We may update these Terms from time to time. The "Last updated" date at the top of this page shows when they last changed. Continuing to use the website after an update means you accept the new Terms.

## 13. Governing law

These Terms are governed by the laws of the Federal Republic of Nigeria.

## 14. Contact us

Questions about these Terms? Reach us using the contact details at the bottom of every page.
$terms$),

('privacy', 'Privacy Policy', true, $privacy$
_Last reviewed: draft for client approval. Please have this policy checked by the business owner and a legal adviser before relying on it._

This Privacy Policy explains what personal information {brand} collects when you use our website, why we collect it, and how we protect it. We process personal data in line with the Nigeria Data Protection Act 2023.

## 1. Information we collect

- **Account details:** your email address, and your name if you provide it or sign in with a third-party sign-in provider.
- **Contact and delivery details:** your name, phone number and delivery address, and any notes you add to an order.
- **Order information:** what you ordered, when, how much you paid, and the order's status.
- **Rewards:** your referral code, who referred you (if anyone), and your referral bonus and loyalty points history.
- **Favourites:** dishes you choose to save.

We do **not** collect or store your full card or bank details. Payments are handled directly by our third-party payment processor.

## 2. How we use your information

- To create and manage your account and sign you in.
- To process, prepare and deliver your orders, and to contact you about them.
- To send order confirmations and important service emails.
- To run the referral and loyalty programs.
- To keep the website secure and prevent fraud or misuse.
- To understand overall sales so we can improve our service.

We do not sell your personal information.

## 3. Who we share it with

We share only what is needed, with trusted service providers who help us run the website:

- a **payment processor**, to take and verify payments;
- an **email service provider**, to send sign-in codes and order emails;
- a **hosting and database provider**, to run the website and store data securely;
- a **third-party sign-in provider**, only if you choose to sign in with it;
- delivery riders, who receive your name, phone number and address to deliver your order.

We may also share information where the law requires it.

## 4. Cookies and similar technologies

- **Sign-in cookies** keep you logged in securely.
- **A referral cookie** remembers a referral link you followed, for up to 30 days, so your sign-up can be credited.
- **Your cart and preferences** are stored in your own browser so they survive a page refresh.

We do not use advertising or tracking cookies.

## 5. How long we keep it

We keep account and order records for as long as your account is active and as long as needed for legal, tax and accounting purposes. You can ask us to delete your account at any time (see below); some order records may need to be kept for legal reasons.

## 6. Your rights

Under the Nigeria Data Protection Act 2023 you have the right to access the personal data we hold about you, to correct it, to ask us to delete it, to object to or restrict certain processing, and to withdraw consent where we rely on it. You can update your name, phone number and delivery address yourself on your Account page. For anything else, contact us using the details at the bottom of every page.

## 7. Security

We use secure connections, access controls and reputable service providers to protect your information. No system is completely secure, but we work to keep your data safe.

## 8. Children

Our website is not intended for children under 13, and we do not knowingly collect their personal information.

## 9. Changes to this policy

We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page shows when it last changed.

## 10. Contact us

Questions about your privacy? Reach us using the contact details at the bottom of every page.
$privacy$);
