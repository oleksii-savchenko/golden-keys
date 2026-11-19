// Покадровый рендер лендинга «Золоті Ключі» для кейса (Behance).
//
// Время на странице виртуальное: Date, performance.now, requestAnimationFrame, setTimeout/setInterval
// подменены и сдвигаются ровно на 1/60 с за кадр. CSS-анимации и переходы (Web Animations) заморожены
// и выставляются вручную, <video> не играют сами — им на каждом кадре ставится currentTime.
// Поэтому запись идеально плавная, сколько бы ни длился один кадр на самом деле.
//
// Запуск (из корня проекта, после `npm run build`):
//   node case-video/render.mjs --mode desktop --test   — тест 5 с (hero + начало скролла)
//   node case-video/render.mjs --mode desktop          — полный ролик → case-video/desktop-1080p.mp4 и desktop-4k.mp4
//   node case-video/render.mjs --mode mobile           — мобильная версия → case-video/mobile.mp4
// Опции: --keep-frames (не удалять кадры), --chrome <путь к chrome.exe>, --port 3013
// Один раз: cd case-video && npm install

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// ── параметры ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
};
const MODE = arg("mode", "desktop");
const TEST = !!arg("test", false);
// --segment objects|telegram|reels|footer — прогнать сценарий без снимков до этого места и снять 5 с (проверка)
const SEGMENT = arg("segment", "");
const KEEP = !!arg("keep-frames", false);
const PORT = Number(arg("port", 3013));
const CHROME =
  arg("chrome") ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find((p) => fs.existsSync(p));

const FPS = 60;
const DT = 1000 / FPS;
const MOBILE = MODE === "mobile";
const VIEW = MOBILE
  ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { width: 1920, height: 1080, deviceScaleFactor: 2 };
const TAG = `${MODE}${SEGMENT ? "-" + SEGMENT : TEST ? "-test" : ""}`;
const FRAMES = path.join(os.tmpdir(), `golden-keys-frames-${TAG}`);

// ── код, который выполняется в странице до любых её скриптов ───────────────
const SHIM = String.raw`(() => {
  if (window.__vt) return;
  const RDate = Date, rSetTimeout = window.setTimeout.bind(window), rSetInterval = window.setInterval.bind(window);
  const rClearTimeout = window.clearTimeout.bind(window), rClearInterval = window.clearInterval.bind(window);
  const rRAF = window.requestAnimationFrame.bind(window);
  const T0 = RDate.now();
  let now = 0, live = false;

  // таймеры: до старта записи — настоящие (чтобы страница спокойно загрузилась), после — виртуальные
  const timers = new Map(); let tid = 1e7;
  window.setTimeout = function (fn, d, ...a) {
    if (!live) return rSetTimeout(fn, d, ...a);
    const id = tid++; timers.set(id, { fn, at: now + Math.max(0, Number(d) || 0), a, iv: 0 }); return id;
  };
  window.setInterval = function (fn, d, ...a) {
    if (!live) return rSetInterval(fn, d, ...a);
    const iv = Math.max(1, Number(d) || 0), id = tid++; timers.set(id, { fn, at: now + iv, a, iv }); return id;
  };
  window.clearTimeout = (id) => { if (timers.has(id)) timers.delete(id); else rClearTimeout(id); };
  window.clearInterval = (id) => { if (timers.has(id)) timers.delete(id); else rClearInterval(id); };

  // rAF — только виртуальный: GSAP стоит на месте, пока мы не шагнём
  let rafs = new Map(); let rid = 1;
  window.requestAnimationFrame = (fn) => { const id = rid++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };

  performance.now = () => now;
  function VDate(...a) {
    if (!(this instanceof VDate)) return new RDate(T0 + now).toString();
    return a.length ? new RDate(...a) : new RDate(T0 + now);
  }
  VDate.prototype = RDate.prototype; VDate.now = () => T0 + now; VDate.parse = RDate.parse; VDate.UTC = RDate.UTC;
  window.Date = VDate;

  // видео: сами не играют, «играют» виртуально
  const MP = HTMLMediaElement.prototype;
  const ct = Object.getOwnPropertyDescriptor(MP, "currentTime");
  const rPause = MP.pause;
  const vtime = (v) => (v.__vplay ? v.__vbase + (now - v.__vstart) / 1000 : v.__vbase || 0);
  const fire = (v, type) => queueMicrotask(() => v.dispatchEvent(new Event(type)));
  MP.play = function () {
    if (!this.__vplay) {
      if (this.__vbase == null) this.__vbase = ct.get.call(this) || 0;
      this.__vstart = now; this.__vplay = true; fire(this, "play");
      if (this.readyState >= 2) fire(this, "playing");
      else this.addEventListener("loadeddata", () => this.__vplay && fire(this, "playing"), { once: true });
    }
    return Promise.resolve();
  };
  MP.pause = function () {
    if (this.__vplay) { this.__vbase = vtime(this); this.__vplay = false; fire(this, "pause"); }
    return rPause.call(this);
  };
  Object.defineProperty(MP, "paused", { configurable: true, get() { return !this.__vplay; } });
  Object.defineProperty(MP, "currentTime", {
    configurable: true,
    get() { return ct.get.call(this); },
    set(t) { this.__vbase = Number(t) || 0; this.__vstart = now; ct.set.call(this, t); },
  });

  const once = (el, type, ms) => new Promise((r) => {
    const done = () => { el.removeEventListener(type, done); r(); };
    el.addEventListener(type, done); rSetTimeout(done, ms);
  });
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > -50 && r.top < innerHeight + 50 && r.right > -50 && r.left < innerWidth + 50;
  };
  async function seek(v) {
    if (v.readyState < 1) await once(v, "loadedmetadata", 5000);
    if (v.readyState < 1) return;
    let t = vtime(v); const d = v.duration;
    if (isFinite(d) && d > 0) t = v.loop ? t % d : Math.min(t, d - 0.01);
    // в середину кадра исходника (30 к/с): иначе время на границе кадров и Chrome
    // показывает то этот, то предыдущий кадр — видео идёт рывками (1–3 кадра рендера на кадр видео)
    t = (Math.floor(t * 30 + 1e-6) + 0.5) / 30;
    if (isFinite(d) && t > d - 0.005) t = Math.max(0, d - 0.02);
    if (Math.abs(ct.get.call(v) - t) < 1e-4 && v.readyState >= 2) return;
    ct.set.call(v, t);
    await once(v, "seeked", 5000);
  }

  // CSS-анимации и переходы: ставим на паузу и двигаем сами
  const anims = new Map();
  function stepAnims(dt) {
    for (const a of document.getAnimations()) {
      let s = anims.get(a);
      if (!s) { s = { t: Math.max(0, a.currentTime || 0) }; anims.set(a, s); a.pause(); }
      else s.t += dt;
      a.currentTime = s.t;
    }
  }
  const raf = () => new Promise((r) => rRAF(() => r()));

  window.__vt = {
    get now() { return now; },
    // старт записи: виртуальные таймеры, все CSS-анимации — с нуля (первый экран отыгрывает появление заново)
    begin() {
      live = true;
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0; anims.set(a, { t: 0 }); }
    },
    async frame(dt) {
      await raf(); // пусть браузер разошлёт scroll/mouse-события
      now += dt;
      for (let guard = 0; guard < 5000; guard++) {
        let id = null, t = null;
        for (const [k, v] of timers) if (v.at <= now && (!t || v.at < t.at)) { id = k; t = v; }
        if (!t) break;
        if (t.iv) t.at += t.iv; else timers.delete(id);
        try { typeof t.fn === "function" ? t.fn(...t.a) : (0, eval)(t.fn); } catch (e) { console.error(e); }
      }
      const cbs = [...rafs.values()]; rafs.clear();
      for (const cb of cbs) { try { cb(now); } catch (e) { console.error(e); } }
      await Promise.resolve();
      stepAnims(dt);
      await Promise.all([...document.querySelectorAll("video")].filter((v) => v.__vplay && inView(v)).map(seek));
      stepAnims(0);
      await raf(); await raf();
    },
    stats() {
      const vids = [...document.querySelectorAll("video")];
      return {
        now, anims: document.getAnimations().length,
        videos: vids.map((v) => ({ src: (v.currentSrc || "").split("/").pop(), play: !!v.__vplay, t: +(ct.get.call(v) || 0).toFixed(2), rs: v.readyState, view: inView(v) })),
      };
    },
  };
})();`;

// курсор поверх страницы (только десктоп)
const CURSOR = String.raw`(() => {
  const c = document.createElement("div");
  c.id = "__case_cursor";
  c.innerHTML = '<svg width="34" height="34" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><path d="M5 3.5v18.2l4.6-4.3 3 6.8 3.2-1.4-3-6.7h6.4L5 3.5z" fill="#fff" stroke="#1d1f22" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: "fixed", left: "0", top: "0", width: "34px", height: "34px", zIndex: "2147483647",
    pointerEvents: "none", opacity: "0", transform: "translate(-200px,-200px)", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.35))", willChange: "transform" });
  document.documentElement.appendChild(c);
})();`;

// ── сервер со статикой out/ ────────────────────────────────────────────────
function startServer() {
  if (!fs.existsSync(path.join(ROOT, "out/index.html"))) throw new Error("Нет out/ — сначала npm run build");
  const srv = spawn(process.execPath, [path.join(ROOT, "scripts/serve-out.mjs"), String(PORT)], { cwd: ROOT, stdio: "pipe" });
  return new Promise((res, rej) => {
    srv.stdout.on("data", (d) => String(d).includes("serving") && res(srv));
    srv.on("error", rej);
    setTimeout(() => rej(new Error("сервер не стартовал")), 10000);
  });
}

// ── сценарий ───────────────────────────────────────────────────────────────
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2); // ease-in-out cubic
const frames = (sec) => Math.max(1, Math.round(sec * FPS));

async function main() {
  if (!CHROME) throw new Error("Не найден Chrome — укажите --chrome <путь>");
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  const srv = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    // без --force-device-scale-factor новый headless отдаёт снимок в 1× даже при deviceScaleFactor 2
    args: [
      "--hide-scrollbars", "--mute-audio", "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
      `--force-device-scale-factor=${VIEW.deviceScaleFactor}`, `--window-size=${VIEW.width},${VIEW.height + 200}`,
    ],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  const cdp = await page.createCDPSession();
  page.on("console", (m) => m.type() === "error" && console.log("  [page]", m.text().slice(0, 200)));
  page.on("pageerror", (e) => console.log("  [page error]", String(e).slice(0, 200)));

  // без аналитики (иначе рендер попадёт в статистику)
  await page.setRequestInterception(true);
  page.on("request", (r) => (/googletagmanager|google-analytics|doubleclick/.test(r.url()) ? r.abort() : r.continue()));
  await page.evaluateOnNewDocument(SHIM);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

  console.log(`▶ ${TAG}: ${VIEW.width}×${VIEW.height} @${VIEW.deviceScaleFactor}x, Chrome: ${path.basename(CHROME)}`);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);

  // ── прогрев: прогоняем страницу вниз-вверх (виртуальное время стоит), чтобы подгрузились
  //    все ленивые постеры/видео/картинки, затем ждём, пока всё скачается
  await page.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager")));
  const H = await page.evaluate(() => document.scrollingElement.scrollHeight);
  for (let y = 0; y <= H; y += Math.round(VIEW.height * 0.6)) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await new Promise((r) => setTimeout(r, 120));
  }
  await page.evaluate(() => {
    document.querySelectorAll("video").forEach((v) => {
      v.querySelectorAll("source[data-src]").forEach((s) => { if (!s.src) s.src = s.dataset.src; });
      if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster;
      v.preload = "auto";
      if (v.readyState === 0 && (v.currentSrc || v.querySelector("source[src]") || v.src)) v.load();
    });
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 120000 }).catch(() => {});
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    await Promise.all([...document.querySelectorAll("video")].map((v) =>
      v.readyState >= 2 || !(v.currentSrc || v.querySelector("source[src]") || v.getAttribute("src"))
        ? 0
        : new Promise((r) => { v.addEventListener("loadeddata", r, { once: true }); setTimeout(r, 15000); })));
  });
  await new Promise((r) => setTimeout(r, 500));

  if (!MOBILE) await page.evaluate(CURSOR);
  await page.evaluate(() => window.__vt.begin());

  // ── состояние кадра ──
  let n = 0;
  let scrollY = 0;
  const cur = { x: VIEW.width * 0.62, y: VIEW.height * 0.75, o: 0 };
  let mouseOn = false;
  const limit = TEST || SEGMENT ? frames(Number(arg("seconds", 5))) : Infinity;
  let capturing = !SEGMENT, stepped = 0;
  const mark = (name) => { if (SEGMENT === name) { capturing = true; console.log(`  ▶ снимаю с «${name}» (${(stepped / FPS).toFixed(1)} с)`); } };
  const t0 = Date.now();

  async function tick() {
    if (n >= limit) throw Object.assign(new Error("limit"), { limit: true });
    await page.evaluate(
      ({ y, c }) => {
        window.scrollTo({ top: y, behavior: "instant" });
        const el = document.getElementById("__case_cursor");
        if (el) { el.style.opacity = String(c.o); el.style.transform = `translate(${c.x - 6}px, ${c.y - 4}px)`; }
      },
      { y: scrollY, c: cur },
    );
    if (!MOBILE) {
      // мышь «на странице» только пока курсор виден, иначе — в углу, чтобы при скролле не цеплять ховеры
      const on = cur.o > 0.01;
      if (on || mouseOn) await page.mouse.move(on ? cur.x : 0, on ? cur.y : 0);
      mouseOn = on;
    }
    await page.evaluate((dt) => window.__vt.frame(dt), DT);
    stepped++;
    if (!capturing) return;
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
    if (n === 0) {
      const b = Buffer.from(data, "base64"), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
      const ew = VIEW.width * VIEW.deviceScaleFactor, eh = VIEW.height * VIEW.deviceScaleFactor;
      if (w !== ew || h !== eh) throw new Error(`кадр ${w}×${h}, ожидался ${ew}×${eh}`);
    }
    fs.writeFileSync(path.join(FRAMES, `${String(n).padStart(6, "0")}.png`), Buffer.from(data, "base64"));
    n++;
    if (n % 60 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${(n / FPS).toFixed(0)} с видео · ${(el / n).toFixed(2)} с/кадр · scrollY ${Math.round(scrollY)}`);
    }
  }

  const wait = async (sec) => { for (let i = frames(sec); i--; ) await tick(); };

  // прямоугольник элемента в координатах документа
  const rect = (sel, text) =>
    page.evaluate(
      ({ sel, text }) => {
        const els = [...document.querySelectorAll(sel)].filter((e) => !text || e.textContent.trim().includes(text));
        const e = els[0];
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      },
      { sel, text },
    );
  const maxScroll = () => page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);

  // плавный скролл; длительность — от расстояния (в экранах), чтобы текст успевал читаться
  async function scrollTo(y1) {
    y1 = Math.max(0, Math.min(await maxScroll(), Math.round(y1)));
    const y0 = scrollY, d = Math.abs(y1 - y0) / VIEW.height;
    if (d < 0.01) return;
    const sec = Math.min(5, Math.max(1.3, 1.0 + 0.85 * d));
    const N = frames(sec);
    for (let i = 1; i <= N; i++) { scrollY = y0 + (y1 - y0) * ease(i / N); await tick(); }
  }
  // кадрировать блок: от topSel до bottomSel целиком в экране (по центру), если не влезает — показать низ
  async function frameBlock(topSel, bottomSel = topSel, preferTop = false) {
    const a = await rect(topSel), b = await rect(bottomSel);
    if (!a || !b) return console.log(`  ! не найден ${topSel}`);
    const m = VIEW.height * 0.06, lo = b.bottom + m - VIEW.height, hi = a.top - m;
    await scrollTo(lo <= hi ? (lo + hi) / 2 : preferTop ? a.top - VIEW.height * 0.04 : lo);
  }
  async function cursorTo(x, y, sec = 0.9) {
    const x0 = cur.x, y0 = cur.y, N = frames(sec);
    for (let i = 1; i <= N; i++) { const p = ease(i / N); cur.x = x0 + (x - x0) * p; cur.y = y0 + (y - y0) * p; await tick(); }
  }
  async function cursorFade(to, sec = 0.3) {
    const o0 = cur.o, N = frames(sec);
    for (let i = 1; i <= N; i++) { cur.o = o0 + (to - o0) * (i / N); await tick(); }
  }
  // центр элемента в координатах экрана (после текущего скролла)
  const screenPos = async (sel, text) => {
    const r = await rect(sel, text);
    return r && { x: r.cx, y: r.cy }; // cx/cy — уже координаты экрана
  };
  async function press(sel, text) {
    const p = await screenPos(sel, text);
    if (!p) return console.log(`  ! нет кнопки ${text}`);
    if (MOBILE) await page.touchscreen.tap(p.x, p.y);
    else { await page.mouse.down(); await page.mouse.up(); }
  }

  try {
    // 1. Hero — появление
    await wait(3);
    // 2. Цифры
    await frameBlock('section[aria-label="Містечко в цифрах"]');
    await wait(2);
    mark("objects");
    // 3. Актуальні об'єкти: hover по карточке, вкладки Продаж → Оренда → Продаж
    // мобила: карточки столбиком — сначала заголовок и вкладки, потом пролистываем карточки
    if (MOBILE) await frameBlock("#objects-title", '[role="tablist"]', true);
    else await frameBlock("#objects", "#objects-panel");
    await wait(1);
    if (!MOBILE) {
      const card = await screenPos("#objects-panel [data-card] a");
      await cursorFade(1, 0.25);
      if (card) await cursorTo(card.x, card.y, 1.0);
      await wait(1.6);
      const t1 = await screenPos('[role="tab"]', "Оренда");
      if (t1) await cursorTo(t1.x, t1.y, 0.9);
      await wait(0.25);
      await press('[role="tab"]', "Оренда");
      await wait(1.8);
      const t2 = await screenPos('[role="tab"]', "Продаж");
      if (t2) await cursorTo(t2.x, t2.y, 0.7);
      await wait(0.25);
      await press('[role="tab"]', "Продаж");
      await wait(1.6);
      await cursorTo(cur.x + VIEW.width * 0.12, cur.y + VIEW.height * 0.2, 0.6);
      await cursorFade(0, 0.3);
    } else {
      await press('[role="tab"]', "Оренда");
      await wait(2);
      await press('[role="tab"]', "Продаж");
      await wait(1.8);
      const g = await rect("#objects-panel");
      if (g) await scrollTo(g.bottom - VIEW.height * 0.94);
      await wait(1.2);
    }
    mark("telegram");
    // 4. Telegram + hover на «Підписатися на канал»
    await frameBlock('section[aria-labelledby="tg-title"]');
    await wait(1.5);
    if (!MOBILE) {
      const btn = await screenPos('section[aria-labelledby="tg-title"] a', "Підписатися");
      cur.x = VIEW.width * 0.75; cur.y = VIEW.height * 0.8;
      await cursorFade(1, 0.25);
      if (btn) await cursorTo(btn.x, btn.y, 0.9);
      await wait(1.8);
      await cursorTo(cur.x + VIEW.width * 0.1, cur.y + VIEW.height * 0.12, 0.5);
      await cursorFade(0, 0.3);
    } else await wait(1);
    mark("reels");
    // 5. «Краще один раз побачити» — лента играет
    await frameBlock("#reels-title", 'section[aria-labelledby="reels-title"] [data-r="cta"]', true);
    await wait(MOBILE ? 3.5 : 3);
    mark("footer");
    // 6. Футер
    await scrollTo(await maxScroll());
    await wait(3);
  } catch (e) {
    if (!e.limit) throw e;
  }

  const st = await page.evaluate(() => window.__vt.stats());
  console.log(`  кадров: ${n} (${(n / FPS).toFixed(1)} с), видео в кадре:`, st.videos.filter((v) => v.view).map((v) => `${v.src} play=${v.play} t=${v.t}`).join(", "));
  await browser.close();
  srv.kill();

  // ── сборка MP4 ──
  const enc = ["-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
  const input = ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(FRAMES, "%06d.png")];
  const run = (a) => new Promise((res, rej) => {
    const p = spawn(ffmpegPath, a, { stdio: "inherit" });
    p.on("exit", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c))));
  });
  const outs = [];
  if (MOBILE) {
    outs.push(path.join(HERE, `${TAG}.mp4`));
    await run([...input, ...enc, outs[0]]);
  } else {
    outs.push(path.join(HERE, TAG === "desktop" ? "desktop-1080p.mp4" : `${TAG}-1080p.mp4`));
    await run([...input, "-vf", "scale=1920:1080:flags=lanczos", ...enc, outs[0]]);
    if (TAG === "desktop") {
      outs.push(path.join(HERE, "desktop-4k.mp4"));
      await run([...input, ...enc, outs[1]]);
    }
  }
  if (!KEEP) fs.rmSync(FRAMES, { recursive: true, force: true });
  else console.log("  кадры:", FRAMES);
  for (const o of outs) console.log(`✔ ${o} (${(fs.statSync(o).size / 1e6).toFixed(1)} МБ)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
