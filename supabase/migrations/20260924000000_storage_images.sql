-- Plateful — image storage (replaces Cloudinary; see docs/progress.md 2026-09-24)
-- One public bucket, `images`, with top-level folders:
--   menu-items/  → menu_items.image_url
--   branding/    → site_settings.logo_url
--   pages/       → pages.chef_photo_url (step 11)
-- Anyone can view (public bucket); only staff can upload/replace/delete.

-- Size + type limits are enforced by Storage itself on every upload, not
-- just by the browser's file picker.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without a select policy. This select
-- policy is only for staff tooling: Storage requires SELECT alongside
-- DELETE to remove a file.
create policy "images: staff select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'images' and (select public.is_staff()));

create policy "images: staff upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'images'
    and (select public.is_staff())
    and (storage.foldername(name))[1] in ('menu-items', 'branding', 'pages')
  );

create policy "images: staff update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'images' and (select public.is_staff()))
  with check (
    bucket_id = 'images'
    and (select public.is_staff())
    and (storage.foldername(name))[1] in ('menu-items', 'branding', 'pages')
  );

create policy "images: staff delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'images' and (select public.is_staff()));
