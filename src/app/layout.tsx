import type { Metadata, Viewport } from "next";
import { interTight } from "@/lib/fonts";
import { SITE_URL, links, settings, asset } from "@/content/site";
import ViewportHeight from "@/components/ViewportHeight";
import "./globals.css";

// SITE_URL уже включает подпапку GitHub Pages (если она есть), поэтому все адреса — абсолютные
const title = settings.metaTitle;
const description = settings.metaDescription;
const OG = `${SITE_URL}/og.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: `${SITE_URL}/`,
    siteName: "Золоті Ключі",
    title,
    description,
    images: [{ url: OG, width: 1200, height: 630, alt: "Котеджне містечко Золоті Ключі з висоти" }],
  },
  twitter: { card: "summary_large_image", title, description, images: [OG] },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "@id": `${SITE_URL}/#agent`,
      name: "Золоті Ключі",
      description,
      url: SITE_URL,
      image: `${SITE_URL}/og.jpg`,
      logo: `${SITE_URL}/icon-512.png`,
      telephone: links.phone.replace("tel:", ""),
      areaServed: "Дніпро",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Слобожанське",
        addressRegion: "Дніпропетровська область",
        addressCountry: "UA",
      },
      sameAs: [links.telegram, links.instagram],
    },
    {
      "@type": "Place",
      "@id": `${SITE_URL}/#place`,
      name: "Котеджне містечко «Золоті Ключі»",
      description: "Закрите котеджне містечко з інфраструктурою: 260 га, власне озеро, охорона 24/7.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Слобожанське",
        addressRegion: "Дніпропетровська область",
        addressCountry: "UA",
      },
      containedInPlace: { "@type": "City", name: "Дніпро" },
      amenityFeature: [
        "Власне озеро 4 га",
        "2 басейни",
        "Тенісні корти",
        "Спортзал",
        "Дитячий садок",
        "2 кафе",
        "Магазин",
        "Охорона 24/7",
      ].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Золоті Ключі",
      inLanguage: "uk",
      publisher: { "@id": `${SITE_URL}/#agent` },
    },
  ],
};

// до гидрации: html.js (скрыть первый экран для анимации) + страховочный показ, если скрипты не стартовали
const boot = `document.documentElement.classList.add('js');setTimeout(function(){if(!window.__heroStarted)document.documentElement.classList.add('reveal-fallback')},2500);`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={interTight.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <link rel="preload" as="image" href={asset("/media/bg/hero-m.webp")} media="(max-width: 767px)" fetchPriority="high" />
        <link rel="preload" as="image" href={asset("/media/bg/hero.webp")} media="(min-width: 768px)" fetchPriority="high" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <ViewportHeight />
        {children}
      </body>
    </html>
  );
}
