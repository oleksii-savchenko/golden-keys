// Оптимизация медиа, загруженных через админку. Запускается в GitHub Actions перед сборкой
// (в репозитории остаются оригиналы, на сайт уходят сжатые версии).
//  • видео в public/media/video: если больше 960 px по высоте или битрейт > 1.8 Мбит/с —
//    перекодируются в H.264 (≤ 540×960 для вертикальных, ≤ 960 px по большей стороне иначе), AAC моно, faststart;
//  • для каждого видео без обложки делается <имя>.poster.webp (первый кадр);
//  • фото в public/media/img и public/media/posters больше 1600 px или 600 КБ — уменьшаются и пережимаются.
// Результаты кешируются в .media-cache по хешу исходника, чтобы не перекодировать заново при каждой сборке.
// Локально: FF=путь/к/ffmpeg node scripts/optimize-media.mjs (без ffmpeg видео пропускаются).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const FF = process.env.FF || "ffmpeg";
const FP = process.env.FFPROBE || FF.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const CACHE = ".media-cache";
fs.mkdirSync(CACHE, { recursive: true });

const hash = (file) => crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
const has = (bin) => {
  try {
    execFileSync(bin, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const kb = (n) => `${Math.round(n / 1024)} КБ`;

// ── видео ───────────────────────────────────────────────────────────────────
const VIDEO_DIR = "public/media/video";
if (!has(FF)) {
  console.log("ffmpeg не найден — видео пропущены");
} else if (fs.existsSync(VIDEO_DIR)) {
  for (const f of fs.readdirSync(VIDEO_DIR).filter((f) => /\.mp4$/i.test(f))) {
    const file = path.join(VIDEO_DIR, f);
    const h = hash(file);
    const cached = path.join(CACHE, `${h}.mp4`);

    let info = { width: 0, height: 0, bitrate: 0 };
    try {
      const out = execFileSync(FP, [
        "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height:format=bit_rate",
        "-of", "json", file,
      ]).toString();
      const j = JSON.parse(out);
      info = { width: j.streams?.[0]?.width ?? 0, height: j.streams?.[0]?.height ?? 0, bitrate: Number(j.format?.bit_rate ?? 0) };
    } catch {}

    const big = Math.max(info.width, info.height) > 960 || info.bitrate > 1_800_000;
    if (big) {
      if (!fs.existsSync(cached)) {
        const vertical = info.height >= info.width;
        const scale = vertical ? "scale=-2:'min(960,ih)'" : "scale='min(960,iw)':-2";
        console.log(`сжимаю ${f} (${info.width}×${info.height}, ${Math.round(info.bitrate / 1000)} кбит/с)…`);
        execFileSync(FF, [
          "-hide_banner", "-loglevel", "error", "-y", "-i", file,
          "-vf", `${scale}:flags=lanczos,format=yuv420p`,
          "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-maxrate", "1500k", "-bufsize", "3000k",
          "-profile:v", "high", "-c:a", "aac", "-b:a", "80k", "-ac", "1",
          "-movflags", "+faststart", cached,
        ], { stdio: "inherit" });
      }
      const before = fs.statSync(file).size;
      fs.copyFileSync(cached, file);
      console.log(`  ${f}: ${kb(before)} → ${kb(fs.statSync(file).size)}`);
    }

    // обложка (первый кадр), если её ещё нет
    const poster = path.join(VIDEO_DIR, f.replace(/\.mp4$/i, ".poster.webp"));
    if (!fs.existsSync(poster)) {
      const cachedPoster = path.join(CACHE, `${h}.poster.webp`);
      if (!fs.existsSync(cachedPoster)) {
        const jpg = path.join(CACHE, `${h}.jpg`);
        execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-ss", "0.3", "-i", file, "-frames:v", "1", "-q:v", "3", jpg]);
        await sharp(jpg).resize({ width: 540, withoutEnlargement: true }).webp({ quality: 78 }).toFile(cachedPoster);
        fs.unlinkSync(jpg);
      }
      fs.copyFileSync(cachedPoster, poster);
      console.log(`  обложка ${path.basename(poster)}`);
    }
  }
}

// ── фото ────────────────────────────────────────────────────────────────────
for (const dir of ["public/media/img", "public/media/posters"]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
    const file = path.join(dir, f);
    const size = fs.statSync(file).size;
    const meta = await sharp(file).metadata();
    if ((meta.width ?? 0) <= 1600 && size <= 600 * 1024) continue;
    const h = hash(file);
    const ext = path.extname(f).toLowerCase();
    const cached = path.join(CACHE, `${h}${ext}`);
    if (!fs.existsSync(cached)) {
      let img = sharp(file).rotate().resize({ width: 1600, withoutEnlargement: true });
      if (ext === ".png") img = img.png({ compressionLevel: 9, palette: true, quality: 85 });
      else if (ext === ".webp") img = img.webp({ quality: 82 });
      else img = img.jpeg({ quality: 82, mozjpeg: true });
      await img.toFile(cached);
    }
    fs.copyFileSync(cached, file);
    console.log(`  ${f}: ${kb(size)} → ${kb(fs.statSync(file).size)}`);
  }
}

console.log("медиа готовы");
