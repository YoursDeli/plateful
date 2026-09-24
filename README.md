# Plateful

**Live (test mode):** https://deliciously-yours.netlify.app — Netlify, auto-deploys from `main`.

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

## Deploying (Netlify)

Netlify auto-detects Next.js (OpenNext adapter) — no `netlify.toml` needed;
Node version comes from `.nvmrc`.

1. Netlify → **Add new project → Import from Git → GitHub →** this repo.
   Build command `npm run build`, publish directory `.next` (auto-filled).
2. **Before the first deploy**, add every variable from `.env.local` under
   *Environment variables* (mark keys as secret). `NEXT_PUBLIC_SUPABASE_URL`
   must be present at **build** time — `next.config.ts` uses it to allow
   Supabase Storage images.
3. After the first deploy, set `SITE_URL=https://<your-site>.netlify.app`
   and redeploy. If visitors see "This site is private", set Project
   configuration → Access & security → **Visitor access** to public.
4. Supabase → Auth → URL Configuration: Site URL = the Netlify URL; add
   `https://<your-site>.netlify.app/**` to Redirect URLs.
5. Paystack → Settings → API Keys & Webhooks (Test): Webhook URL =
   `https://<your-site>.netlify.app/api/paystack/webhook`.
6. Brevo → Security → Authorised IPs: Netlify has no fixed IPs — if IP
   blocking is on, turn it off (or order emails will be rejected).
