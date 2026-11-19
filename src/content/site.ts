// Контент сайта: читается из JSON-файлов в /content (их редактирует админка Pages CMS, см. .pages.yml).
// Здесь — только типы, нормализация и производные значения (ссылки, переносы, неразрывные пробелы).

import settingsRaw from "../../content/settings.json";
import heroRaw from "../../content/hero.json";
import statsRaw from "../../content/stats.json";
import objectsRaw from "../../content/objects.json";
import telegramRaw from "../../content/telegram.json";
import reelsRaw from "../../content/reels.json";
import contactsRaw from "../../content/contacts.json";
import footerRaw from "../../content/footer.json";
import privacyRaw from "../../content/privacy.json";


// Pages CMS при сохранении убирает пустые поля, поэтому любое поле может отсутствовать — типы намеренно «мягкие».
type Loose = { [k: string]: unknown };
const asObj = (v: unknown) => (v && typeof v === "object" ? (v as Loose) : {}) as Loose & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const settingsJson = asObj(settingsRaw);
const heroJson = asObj(heroRaw);
const statsJson = asObj(statsRaw);
const objectsJson = asObj(objectsRaw);
const telegramJson = asObj(telegramRaw);
const reelsJson = asObj(reelsRaw);
const contactsJson = asObj(contactsRaw);
const footerJson = asObj(footerRaw);
const privacyJson = asObj(privacyRaw);
const list = (v: unknown) => (Array.isArray(v) ? v.map(asObj) : []);

const NB = " ";

// ── пути ────────────────────────────────────────────────────────────────────
/** Префикс сайта (GitHub Pages без своего домена отдаёт сайт из подпапки /<repo>). */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
/** Путь к файлу из /public с учётом префикса. Внешние ссылки не трогает. */
export const asset = (p?: string | null) => {
  if (!p) return "";
  return p.startsWith("/") && !p.startsWith("//") ? BASE_PATH + p : p;
};

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://golden-keys.hawk-style.com").replace(/\/$/, "");

// ── текст ───────────────────────────────────────────────────────────────────
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** Строки текста (перенос строки в админке = новая строка на сайте). */
export const lines = (v: unknown) => str(v).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
/** Неразрывные пробелы: после чисел («210 м²», «2,6 сотки») и перед тире. */
export const nb = (v: unknown) => str(v).replace(/(\d) (?=\S)/g, `$1${NB}`).replace(/ (—|–)/g, `${NB}$1`);
/** Постер к видео: заданный вручную или созданный при сборке рядом с видео (<имя>.poster.webp). */
const posterFor = (video: string, poster?: string) =>
  asset(str(poster) || (video ? video.replace(/\.[a-z0-9]+$/i, ".poster.webp") : ""));

// ── общие настройки и ссылки ────────────────────────────────────────────────
const phoneDigits = str(settingsJson.phone).replace(/\D/g, "");
const telHref = phoneDigits ? `tel:+${phoneDigits.startsWith("380") ? phoneDigits : "38" + phoneDigits.replace(/^38/, "")}` : "";

export const settings = {
  metaTitle: str(settingsJson.metaTitle),
  metaDescription: str(settingsJson.metaDescription),
  /** Google Tag Manager, напр. GTM-N4SSK4H5; пусто или неверный формат — не подключаем */
  gtmId: /^GTM-[A-Z0-9]+$/.test(str(settingsJson.gtmId).trim().toUpperCase()) ? str(settingsJson.gtmId).trim().toUpperCase() : "",
};

export const links = {
  telegram: str(settingsJson.telegram),
  instagram: str(settingsJson.instagram),
  phone: telHref,
  phoneText: nb(str(settingsJson.phone).replace(/ /g, NB)),
  hawk: "https://hawk-style.com/?utm_source=golden-keys&utm_medium=referral&utm_campaign=footer",
};

// фоновые видео — не редактируются в админке
export const media = {
  hero: { mp4: asset("/media/bg/hero.mp4"), poster: asset("/media/bg/hero.webp") },
  contacts: { mp4: asset("/media/bg/contacts.mp4"), poster: asset("/media/bg/contacts.webp") },
  telegram: { mp4: asset("/media/bg/telegram.mp4"), poster: asset("/media/bg/telegram.webp") },
};

// ── блоки ───────────────────────────────────────────────────────────────────
export const hero = {
  title: str(heroJson.title),
  subtitle: nb(heroJson.subtitle),
  location: lines(heroJson.location),
  about: lines(heroJson.aboutText),
  aboutLabel: `Дивитися відео: ${lines(heroJson.aboutText).join(" ")}`,
  aboutVideo: asset(str(heroJson.aboutVideo)),
  aboutPoster: posterFor(str(heroJson.aboutVideo), heroJson.aboutPoster),
  cta: nb(heroJson.ctaText),
  ctaLink: str(heroJson.ctaLink) || links.telegram,
};

export type Stat = { value: number; suffix: string; plus: boolean; unit: string; text: string; mobileWide: boolean };
export const stats: Stat[] = list(statsJson.items).map((s) => ({
  value: Math.max(0, Math.round(Number(s.value) || 0)),
  suffix: str(s.suffix),
  plus: Boolean(s.plus),
  unit: nb(s.unit),
  text: nb(s.text),
  mobileWide: Boolean(s.mobileWide),
}));

export type Listing = { title: string; area: string; plot: string; img: string; alt: string; link: string };
const listing = (o: Loose): Listing => ({
  title: nb(o.title),
  area: nb(o.area).replace(/ /g, NB),
  plot: nb(o.plot).replace(/ /g, NB),
  img: asset(str(o.image)),
  alt: str(o.alt) || str(o.title),
  link: str(o.link) || links.telegram,
});

export const objects = {
  title: str(objectsJson.title),
  text: nb(objectsJson.text),
  more: str(objectsJson.moreText),
  labelArea: str(objectsJson.areaLabel),
  labelPlot: str(objectsJson.plotLabel),
  tabs: [
    { id: "sale" as const, label: str(objectsJson.saleLabel), items: list(objectsJson.sale).map(listing) },
    { id: "rent" as const, label: str(objectsJson.rentLabel), items: list(objectsJson.rent).map(listing) },
  ].filter((t) => t.items.length > 0),
};
export type TabId = "sale" | "rent";

const ICONS = { home: "icoHome", pin: "icoPin", camera: "icoCam" } as const;
export const telegram = {
  title: lines(telegramJson.title).map(nb),
  features: list(telegramJson.features).map((f) => ({
    icon: ICONS[(f.icon as keyof typeof ICONS) ?? "home"] ?? ICONS.home,
    text: lines(f.text).map(nb),
  })),
  cta: nb(telegramJson.ctaText),
  note: lines(telegramJson.note).map(nb),
};

export const reels = {
  title: str(reelsJson.title),
  text: nb(reelsJson.text),
  cta: nb(reelsJson.ctaText),
  ctaLink: str(reelsJson.ctaLink) || links.telegram,
  items: list(reelsJson.videos)
    .filter((v) => str(v.video))
    .map((v) => ({ mp4: asset(str(v.video)), poster: posterFor(str(v.video), v.poster) })),
};

const contactWords = str(contactsJson.title).split(/\s+/).filter(Boolean);
export const contacts = {
  /** слова слева и справа от логотипа */
  left: contactWords.slice(0, Math.ceil(contactWords.length / 2)).join(NB),
  right: contactWords.slice(Math.ceil(contactWords.length / 2)).join(NB),
  title: str(contactsJson.title),
  items: [
    { title: links.phoneText, text: nb(contactsJson.phoneCaption), href: links.phone, external: false },
    { title: str(contactsJson.telegramTitle), text: nb(contactsJson.telegramCaption), href: links.telegram, external: true },
    { title: str(contactsJson.instagramTitle), text: nb(contactsJson.instagramCaption), href: links.instagram, external: true },
  ].filter((i) => i.title && i.href),
};

export const footer = {
  name: str(footerJson.name),
  sub: str(footerJson.sub),
  privacy: str(footerJson.privacyLink),
  dev: ["Розробка сайту", "Hawk Style Design"],
};

export const privacy = {
  title: str(privacyJson.title),
  updated: str(privacyJson.updated),
  html: str(privacyJson.body),
};
