// Подготовка картинок: WebP через sharp, OG 1200×630, фавиконки,
// SVG из Figma → TS-модули с разметкой (для инлайна и анимаций).
// Запуск: npm run images
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "assets-src/figma";
const IMG = "public/media/img";
const POS = "public/media/posters";
const SVG_OUT = "src/components/svg/markup.ts";
fs.mkdirSync(IMG, { recursive: true });

// карточки объектов: слот 526×291 → 1100px по ширине (2x), качество 82
const cards = {
  "obj-sale-1": "obj1.png",
  "obj-sale-2": "obj2.png",
  "obj-sale-3": "obj3.png",
  "obj-rent-1": "rent1.jpg",
  "obj-rent-2": "rent2.jpg",
  "obj-rent-3": "rent3.jpg",
};
for (const [name, file] of Object.entries(cards)) {
  await sharp(path.join(SRC, file))
    .resize({ width: 1100, height: 609, fit: "cover", withoutEnlargement: false })
    .webp({ quality: 82 })
    .toFile(path.join(IMG, `${name}.webp`));
}

// постеры видео → WebP (рилсы — в posters, фоны — в bg)
for (const dir of [POS, "public/media/bg"]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".jpg"))) {
    const n = f.replace(/\.jpg$/, "");
    await sharp(path.join(dir, f))
      .resize({ width: dir === POS ? 540 : 1600, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(dir, `${n}.webp`));
    fs.unlinkSync(path.join(dir, f));
  }
}

// OG: 1200×630 JPG (из фрейма OG 1200×600 в Figma)
await sharp(path.join(SRC, "og.jpg"))
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile("public/og.jpg");

// фавиконки из логотипа (тёмный на прозрачном / белом)
const favSvg = fs.readFileSync(path.join(SRC, "fav-logo.svg"), "utf8")
  .replace(/ preserveAspectRatio="none"| overflow="visible"| style="[^"]*"/g, "");
fs.writeFileSync("src/app/icon.svg", favSvg);
const favBuf = Buffer.from(favSvg.replace(/width="50" height="50"/, 'width="512" height="512"'));
await sharp(favBuf).resize(32, 32).png().toFile("public/favicon-32.png");
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#ffffff" } })
  .composite([{ input: await sharp(favBuf).resize(150, 150).png().toBuffer(), left: 15, top: 15 }])
  .png()
  .toFile("src/app/apple-icon.png");
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ffffff" } })
  .composite([{ input: await sharp(favBuf).resize(440, 440).png().toBuffer(), left: 36, top: 36 }])
  .png()
  .toFile("public/icon-512.png");

// SVG → строки разметки (внутренности <svg> + viewBox)
const clean = (s) =>
  s
    .replace(/<\?xml[^>]*>/, "")
    .replace(/ id="[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .trim();
const inner = (s) => {
  const vb = s.match(/viewBox="([^"]+)"/)[1];
  const body = s.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return { viewBox: vb, body: clean(body) };
};
const svgs = {
  logo: "logo-hero.svg",
  logoDark: "logo-footer.svg",
  hawk: "hawk.svg",
  arrow: "arrow.svg",
  icoArea: "ico-area.svg",
  icoPlot: "ico-plot.svg",
  icoHome: "tg-ico-home.svg",
  icoPin: "tg-ico-pin.svg",
  icoCam: "tg-ico-cam.svg",
};
const out = {};
for (const [k, f] of Object.entries(svgs)) out[k] = inner(fs.readFileSync(path.join(SRC, f), "utf8"));

// лейбл: кольцо текста (+ жёлтые точки) отдельно от логотипа в центре, чтобы крутилось только кольцо
{
  const raw = fs.readFileSync(path.join(SRC, "label.svg"), "utf8");
  const { viewBox, body } = inner(raw);
  const gStart = body.indexOf("<g", 3); // второй <g> — логотип
  const ringPath = body.slice(body.indexOf("<path"), gStart);
  const rest = body.slice(gStart);
  const logoEnd = rest.indexOf("</g>") + 4;
  const logo = rest.slice(0, logoEnd);
  const dots = rest.slice(logoEnd).replace(/<\/g>\s*$/, "");
  out.labelRing = { viewBox, body: clean(ringPath + dots) };
  out.labelLogo = { viewBox, body: clean(logo) };
}

fs.mkdirSync(path.dirname(SVG_OUT), { recursive: true });
fs.writeFileSync(
  SVG_OUT,
  "// Сгенерировано scripts/images.mjs из assets-src/figma — не править руками.\n" +
    "export const svg = " + JSON.stringify(out, null, 2) + " as const;\n" +
    "export type SvgName = keyof typeof svg;\n",
);

console.log("ok");
