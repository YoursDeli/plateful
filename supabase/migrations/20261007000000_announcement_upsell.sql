-- Plateful — client additions (2026-09-28, part 2):
--   1) Scrolling announcement bar under the header; text set by the admin
--      (Settings → Announcement bar). Blank = hidden.
--   2) Upsell pairings between categories ("goes well with"): a category
--      lists the categories to suggest alongside it — on the dish page and
--      in the cart. Edited per category in Admin → Food Menu → Categories.

-- ---------------------------------------------------------------------------
-- 1) Announcement bar
-- ---------------------------------------------------------------------------
alter table public.site_settings
  add column announcement_text text check (char_length(announcement_text) <= 300);

grant update (announcement_text) on public.site_settings to authenticated;

update public.site_settings
   set announcement_text = 'Our Dish is Measured in Bowl not Plates. For more info, call or WhatsApp +234 816 269 4737'
 where id = 1;

-- ---------------------------------------------------------------------------
-- 2) Upsell pairings (categories already have staff-only write RLS)
-- ---------------------------------------------------------------------------
alter table public.categories
  add column upsell_category_ids uuid[] not null default '{}';

-- Client's starting pairs: Soup → Swallow; Rice → Protein, Sides and Extras.
update public.categories c
   set upsell_category_ids = coalesce((
         select array_agg(o.id order by o.sort_order)
           from public.categories o
          where lower(trim(o.name)) = 'swallow'
       ), '{}')
 where lower(trim(c.name)) = 'soup';

update public.categories c
   set upsell_category_ids = coalesce((
         select array_agg(o.id order by o.sort_order)
           from public.categories o
          where lower(trim(o.name)) in ('protein', 'sides and extras')
       ), '{}')
 where lower(trim(c.name)) = 'rice';
