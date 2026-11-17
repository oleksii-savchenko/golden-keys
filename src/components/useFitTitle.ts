"use client";

import { useEffect, type RefObject } from "react";

type Opts = {
  /** доля ширины родителя, которую должны занять буквы на десктопе (одна строка) */
  desktop: number;
  /** доля ширины родителя на мобиле (каждое слово — своя строка, считаем по самому широкому) */
  mobile: number;
  /** потолок размера шрифта на мобиле, доля ширины экрана */
  mobileMax: number;
};

/**
 * Подгоняет размер шрифта заголовка так, чтобы края букв (не текстового блока) занимали заданную ширину.
 * Нужно, потому что заголовок редактируется в админке и может быть любой длины.
 * Пока скрипт не отработал, действует размер из CSS (рассчитан на «Золоті Ключі»).
 */
export function useFitTitle(ref: RefObject<HTMLElement | null>, { desktop, mobile, mobileMax }: Opts) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;

    const inkWidth = (text: string, family: string, weight: string) => {
      const size = 100;
      ctx.font = `${weight} ${size}px ${family}`;
      const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
      if ("letterSpacing" in c) c.letterSpacing = `${-0.04 * size}px`;
      const m = ctx.measureText(text);
      let w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      // без поддержки letterSpacing в canvas — учитываем трекинг вручную
      if (!("letterSpacing" in c)) w -= 0.04 * size * (text.length - 1);
      return w / size; // ширина букв на 1px кегля
    };

    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const cs = getComputedStyle(el);
      const words = (el.textContent ?? "").trim().split(/\s+/).filter(Boolean);
      if (!words.length) return;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const W = parent.clientWidth;
      if (isMobile) {
        const widest = Math.max(...words.map((w) => inkWidth(w, cs.fontFamily, cs.fontWeight)));
        const size = Math.min((W * mobile) / widest, window.innerWidth * mobileMax);
        el.style.fontSize = `${size.toFixed(2)}px`;
      } else {
        const size = (W * desktop) / inkWidth(words.join(" "), cs.fontFamily, cs.fontWeight);
        el.style.fontSize = `${size.toFixed(2)}px`;
      }
    };

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [ref, desktop, mobile, mobileMax]);
}
