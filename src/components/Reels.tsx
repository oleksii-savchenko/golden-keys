"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, reveal, reducedMotion, finePointer, isMobile } from "@/lib/anim";
import { reels } from "@/content/site";
import Button from "./Button";
import s from "./Reels.module.css";

// Лента бесшовна, если карточек хотя бы 7 (на 1920 видно ~5,5). Если в админке видео меньше — повторяем их по кругу.
const MIN_CARDS = 7;
const ITEMS: typeof reels.items = [];
if (reels.items.length) while (ITEMS.length < MIN_CARDS) ITEMS.push(...reels.items);
const N = ITEMS.length;

/**
 * Figma 15:7 «5 block videos» (y 3786–4876), мобила y 4186–5002.
 * Бесконечная лента: каждая карточка сама «перепрыгивает» за край (wrap), копий для бесшовности нет.
 * Десктоп — ленту двигает скролл страницы (+ можно тянуть мышью); мобила — свайп пальцем, с инерцией.
 * Hover: карточка увеличивается, соседи раздвигаются, появляется play. Клик — звук с того же места; звук только у одного.
 */
export default function Reels() {
  const root = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useState<number | null>(null);
  const soundRef = useRef<number | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (!N) return;
    const el = root.current!;
    const track = strip.current!;
    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-reel]"));
    const videos = cards.map((c) => c.querySelector("video")!);
    const rm = reducedMotion();
    const fine = finePointer();

    const ctx = gsap.context(() => {
      reveal(el.querySelectorAll("[data-r='head']"), { trigger: el, stagger: 0.12 });
      reveal(track, { trigger: track, y: 50 });
      reveal(el.querySelector("[data-r='cta']"), { trigger: el.querySelector("[data-r='cta']") });
    }, el);

    // ── геометрия ──
    let step = 0;
    let total = 0;
    const measure = () => {
      const w = cards[0].offsetWidth;
      const gap = w * (isMobile() ? 11.2 / 208.2 : 17 / 315); // зазор из макета
      step = w + gap;
      total = step * N;
    };
    measure();

    // ── состояние ленты ──
    let target = 0;
    let current = 0;
    const wrap = (v: number) => gsap.utils.wrap(-step, total - step, v);

    const render = () => {
      current += (target - current) * (dragging ? 1 : mobile ? 0.22 : 0.09);
      for (let i = 0; i < N; i++) {
        cards[i].style.transform = `translate3d(${wrap(i * step - current).toFixed(2)}px,0,0)`;
      }
    };

    // ── скролл страницы двигает ленту ──
    // десктоп: ×1.6 — пока блок проходит экран, лента успевает показать все 7 видео;
    // мобила: ×1 при закреплённой ленте (pin длиной 6 шагов) — за время закрепления проезжают все 7
    const mobile = isMobile();
    const factor = mobile ? 1 : 1.6;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (!rm) target += (y - lastY) * factor;
      lastY = y;
      if (fine) queueSides();
    };

    // мобила: весь блок (заголовок, текст, лента, кнопка) закрепляется на экране,
    // пока лента не пролистает все 7 видео; двигается только лента
    if (mobile && !rm) {
      ctx.add(() => {
        ScrollTrigger.create({
          trigger: el,
          // контент блока (без верхнего отступа) — по центру экрана
          start: () => {
            const pad = parseFloat(getComputedStyle(el).paddingTop) || 0;
            const content = el.offsetHeight - pad;
            return `top+=${Math.round(pad + (content - window.innerHeight) / 2)} top`;
          },
          end: () => "+=" + Math.round(step * (N - 1)),
          pin: el,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        });
      });
    }

    // ── перетаскивание (мобила — свайп; десктоп — мышью) ──
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTarget = 0;
    let lastX = 0;
    let lastT = 0;
    let vel = 0;
    let decided = false;
    let horizontal = false;
    let inertia: gsap.core.Tween | null = null;

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      inertia?.kill();
      dragging = true;
      decided = e.pointerType === "mouse";
      horizontal = e.pointerType === "mouse";
      dragged.current = false;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startTarget = target;
      lastT = performance.now();
      vel = 0;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!decided && Math.hypot(dx, dy) > 6) {
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
        if (!horizontal) {
          dragging = false;
          return;
        }
      }
      if (!horizontal) return;
      if (Math.abs(dx) > 6) dragged.current = true;
      if (dragged.current) track.setPointerCapture?.(e.pointerId);
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      vel = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
      target = startTarget - dx;
      current = target;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      if (dragged.current && Math.abs(vel) > 0.05) {
        const o = { t: target };
        inertia = gsap.to(o, {
          t: target - vel * 380,
          duration: 1.1,
          ease: "power3.out",
          onUpdate: () => {
            target = o.t;
          },
        });
      }
    };

    // ── hover: соседи слева/справа от карточки под курсором раздвигаются (CSS-переход, синхронно с зумом).
    // Стороны пересчитываются и при наведении, и при скролле — лента едет под неподвижным курсором.
    const updateSides = () => {
      const h = track.querySelector<HTMLElement>("[data-reel]:hover");
      const hx = h ? h.getBoundingClientRect().left : 0;
      for (const c of cards) {
        if (!h || c === h) delete c.dataset.side;
        else c.dataset.side = c.getBoundingClientRect().left < hx ? "l" : "r";
      }
    };
    let sidesTimer = 0;
    const queueSides = () => {
      if (sidesTimer) return;
      sidesTimer = window.setTimeout(() => {
        sidesTimer = 0;
        updateSides();
      }, 40);
    };
    const clearSides = () => cards.forEach((c) => delete c.dataset.side);
    if (fine) {
      track.addEventListener("pointerover", updateSides);
      track.addEventListener("pointerleave", clearSides);
    }

    // ── видео играют, пока блок виден ──
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      videos.forEach((v) => {
        const src = v.querySelector<HTMLSourceElement>("source[data-src]");
        if (src) {
          src.src = src.dataset.src!;
          v.load();
        }
      });
    };
    const near = new IntersectionObserver((es) => es[0].isIntersecting && load(), { rootMargin: "400px 0px" });
    near.observe(track);
    let visible = false;
    // играют только видео, которые сейчас в кадре ленты (видео может быть много — не грузим телефон)
    const syncPlayback = () => {
      const w = cards[0].offsetWidth;
      const vw = track.clientWidth;
      for (let i = 0; i < N; i++) {
        const v = videos[i];
        const x = wrap(i * step - current);
        const inView = visible && x > -w && x < vw;
        const want = inView && (!rm || soundRef.current === i);
        if (want && v.paused) v.play().catch(() => {});
        else if (!want && !v.paused) v.pause();
      }
    };
    const vis = new IntersectionObserver(
      (es) => {
        visible = es[0].isIntersecting;
        if (visible) load();
        syncPlayback();
      },
      { threshold: 0.05 },
    );
    vis.observe(track);

    // кадр: двигаем ленту только когда блок рядом с экраном
    let frame = 0;
    const tick = () => {
      if (visible || dragging) render();
      if (visible && ++frame % 12 === 0) syncPlayback();
      // лента может доезжать по инерции под неподвижным курсором — обновляем стороны соседей
      if (fine && visible && Math.abs(target - current) > 0.5 && track.matches(":hover")) queueSides();
    };
    render();
    gsap.ticker.add(tick);

    const onResize = () => {
      measure();
      render();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    track.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    return () => {
      ctx.revert();
      gsap.ticker.remove(tick);
      inertia?.kill();
      near.disconnect();
      vis.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      track.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (fine) {
        track.removeEventListener("pointerover", updateSides);
        track.removeEventListener("pointerleave", clearSides);
      }
      clearTimeout(sidesTimer);
    };
  }, []);

  // клик: звук с того же места, только у одного видео
  const toggleSound = (i: number) => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    const videos = Array.from(strip.current!.querySelectorAll("video"));
    const v = videos[i];
    const rm = reducedMotion();
    if (soundRef.current === i) {
      v.muted = true;
      if (rm) v.pause();
      soundRef.current = null;
      setSound(null);
      return;
    }
    videos.forEach((o, j) => {
      if (j !== i) {
        o.muted = true;
        if (rm) o.pause();
      }
    });
    const src = v.querySelector<HTMLSourceElement>("source[data-src]");
    if (src && !src.src) {
      src.src = src.dataset.src!;
      v.load();
    }
    v.muted = false;
    v.play().catch(() => {});
    soundRef.current = i;
    setSound(i);
  };

  return (
    <section ref={root} className={s.section} aria-labelledby="reels-title">
      <div className={s.head}>
        <h2 id="reels-title" className={s.title} data-r="head">
          {reels.title}
        </h2>
        <p className={s.text} data-r="head">
          {reels.text}
        </p>
      </div>

      <div className={s.stripWrap} data-pin>
        <div ref={strip} className={s.strip}>
          {ITEMS.map((r, i) => (
            <button
              key={i}
              type="button"
              className={`${s.card} ${sound === i ? s.isSound : ""}`}
              data-reel
              onClick={() => toggleSound(i)}
              aria-label={sound === i ? `Відео ${i + 1}: вимкнути звук` : `Відео ${i + 1}: увімкнути звук`}
              aria-pressed={sound === i}
            >
              <span className={s.shift}>
                <span className={s.inner}>
                  <video muted loop playsInline preload="none" poster={r.poster} draggable={false}>
                    <source data-src={r.mp4} type="video/mp4" />
                  </video>
                  <span className={s.play} aria-hidden="true">
                    <svg viewBox="0 0 105 105" className={s.icoPlay}>
                      <path d="M56.7479 51.2007C57.7485 51.778 57.7485 53.222 56.7479 53.7993L48.2496 58.7022C47.2496 59.2791 46 58.5574 46 57.4029L46 47.5971C46 46.4426 47.2496 45.7209 48.2496 46.2978L56.7479 51.2007Z" />
                    </svg>
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={s.cta} data-r="cta">
        <Button w={412} href={reels.ctaLink} external={/^https?:/.test(reels.ctaLink)}>
          {reels.cta}
        </Button>
      </div>
    </section>
  );
}
