# Plateful

**Live (test mode):** https://deliciously-yours-zeta.vercel.app — Vercel, auto-deploys from `main`.

Single-restaurant food ordering site. Project docs live in [`CLAUDE.md`](CLAUDE.md)
and [`docs/`](docs/) — start with [`docs/progress.md`](docs/progress.md).

## Local setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in the Supabase values
   (Paystack/Brevo aren't used yet). `.env.local` is gitignored.
3. **Database:** in the Supabase dashboard → SQL Editor, run each file in
   `supabase/migrations/` in filename order.
4. **Email OTP codes:** Supabase → Authentication → Emails → Templates: paste
   `supabase/templates/confirm-signup.html` into **"Confirm signup"** (first
   sign-in) and `supabase/templates/magic-link.html` into **"Magic Link"**
   (returning users), using the subject line from each file's top comment.
   Both send a code (`{{ .Token }}`), not a clicked link.
5. `npm run dev` → http://localhost:3000

## Making yourself an admin

`profiles.role` can't be changed from the app (by design — see
`docs/branding-security-auth.md` §3). After signing in once at `/login`, run
this in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Then visit `/admin/menu`.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint

## Deploying (Vercel)

Vercel runs Next.js natively — no config file needed.

1. Vercel → **Add New… → Project → Import Git Repository →** this repo.
   Framework preset **Next.js**, root directory `./` (both auto-filled).
2. **Before the first deploy**, paste the contents of `.env.local` into the
   first *Environment Variables* key box (Vercel splits it into entries).
   `NEXT_PUBLIC_SUPABASE_URL` must be present at **build** time —
   `next.config.ts` uses it to allow Supabase Storage images.
3. After the first deploy, add `SITE_URL=https://<your-project>.vercel.app`
   and redeploy (Deployments → ⋯ → Redeploy).
4. Supabase → Auth → URL Configuration: Site URL = the Vercel URL; add
   `https://<your-project>.vercel.app/**` to Redirect URLs.
5. Paystack → Settings → API Keys & Webhooks (Test): Callback URL =
   `https://<your-project>.vercel.app/checkout/verify`, Webhook URL =
   `https://<your-project>.vercel.app/api/paystack/webhook`.
6. Brevo → Security → Authorised IPs: Vercel has no fixed IPs — if IP
   blocking is on, turn it off (or order emails will be rejected).

Notes: the Hobby (free) plan is for personal, non-commercial use — move to
Pro (or another host) before taking real orders. Hobby also blocks deploys of
a **private** repo when the commit author isn't the Vercel account owner.
