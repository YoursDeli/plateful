# Plateful

Single-restaurant food ordering site. Project docs live in [`CLAUDE.md`](CLAUDE.md)
and [`docs/`](docs/) — start with [`docs/progress.md`](docs/progress.md).

## Local setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in the Supabase and Cloudinary
   values (Paystack/Brevo aren't used yet). `.env.local` is gitignored.
3. **Database:** in the Supabase dashboard → SQL Editor, run each file in
   `supabase/migrations/` in filename order.
4. **Email OTP codes:** Supabase → Authentication → Emails → Templates: in
   both **"Confirm signup"** (first sign-in) and **"Magic Link"** (returning
   users), include `{{ .Token }}` in the body so the email contains a code
   (the app uses code entry, not a clicked link).
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
