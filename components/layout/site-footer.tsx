import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatWhatsAppNumber } from "@/lib/phone";
import type { SiteSettings } from "@/lib/supabase/types";

// Site-wide footer (docs/pages-referrals-footer.md §4). Everything comes from
// site_settings (admin → Settings → Contact & footer); empty fields are
// simply left out. Stacks to one column on phones.
export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const socials = [
    { href: settings.instagram_url, label: "Instagram", Icon: InstagramIcon },
    { href: settings.tiktok_url, label: "TikTok", Icon: TikTokIcon },
    { href: settings.facebook_url, label: "Facebook", Icon: FacebookIcon },
    { href: settings.x_url, label: "X", Icon: XIcon },
    {
      href: settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : null,
      label: "WhatsApp",
      Icon: WhatsAppIcon,
    },
  ].filter((s): s is typeof s & { href: string } => Boolean(s.href));

  const heading = "mb-3 text-xs font-semibold tracking-wider text-primary uppercase";
  const link = "text-white/80 transition hover:text-white";

  return (
    <footer className="mt-12 bg-secondary text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <p className="font-display text-2xl font-semibold text-primary">{settings.brand_name}</p>
          {settings.tagline && <p className="text-sm text-white/75">{settings.tagline}</p>}
          {socials.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.brand_name} on ${label}`}
                    className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-primary hover:text-secondary"
                  >
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {settings.opening_hours && (
          <div>
            <h2 className={heading}>Opening hours</h2>
            <p className="text-sm whitespace-pre-line text-white/80">{settings.opening_hours}</p>
          </div>
        )}

        <div>
          <h2 className={heading}>Contact</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {settings.location && <li className="text-white/80">{settings.location}</li>}
            {settings.contact_phone && (
              <li>
                <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`} className={link}>
                  {settings.contact_phone}
                </a>
              </li>
            )}
            {settings.whatsapp_number && (
              <li>
                <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className={link}>
                  WhatsApp {formatWhatsAppNumber(settings.whatsapp_number)}
                </a>
              </li>
            )}
            {settings.contact_email && (
              <li>
                <a href={`mailto:${settings.contact_email}`} className={link}>
                  {settings.contact_email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:col-span-2 lg:col-span-1">
          <div>
            <h2 className={heading}>Explore</h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              <li><Link href="/menu" className={link}>Food Menu</Link></li>
              <li><Link href="/about" className={link}>About</Link></li>
              <li><Link href="/account/referrals" className={link}>Refer &amp; earn</Link></li>
            </ul>
          </div>
          <div>
            <h2 className={heading}>Legal</h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              <li><Link href="/terms" className={link}>Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy" className={link}>Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-white/55">
          © {new Date().getFullYear()} {settings.brand_name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
