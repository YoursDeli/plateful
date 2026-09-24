import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { getSiteSettings, themeCssVars } from "@/lib/site-settings";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { brand_name } = await getSiteSettings();
  return {
    title: { default: brand_name, template: `%s · ${brand_name}` },
    description: `Order from ${brand_name} online.`,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <head>
        <style>{themeCssVars(settings)}</style>
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
