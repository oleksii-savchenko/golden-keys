"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // мобильные браузеры: не пересчитывать триггеры при скрытии адресной строки (иначе pin прыгает)
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };

export const EASE = "power3.out";

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

export const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

type RevealOpts = {
  trigger?: Element | null;
  stagger?: number;
  delay?: number;
  y?: number;
  start?: string;
  blur?: boolean;
};

/**
 * Базовое появление при скролле: снизу + прозрачность + лёгкий blur (не на мобиле), один раз.
 * При prefers-reduced-motion — простой fade без сдвига.
 */
export function reveal(targets: gsap.TweenTarget, opts: RevealOpts = {}) {
  const { trigger, stagger = 0.1, delay = 0, y = 40, start = "top 85%", blur = true } = opts;
  const list = gsap.utils.toArray<Element>(targets);
  if (!list.length) return;
  const rm = reducedMotion();
  const mobile = isMobile();
  return gsap.from(list, {
    y: rm ? 0 : mobile ? y * 0.6 : y,
    autoAlpha: 0,
    filter: rm || mobile || !blur ? "none" : "blur(8px)",
    duration: rm ? 0.6 : 0.9,
    ease: EASE,
    stagger: rm ? 0 : stagger,
    delay,
    clearProps: "filter,transform",
    scrollTrigger: { trigger: trigger ?? list[0], start, once: true },
  });
}

/** 3D-наклон карточки за курсором (только мышь). Возвращает функцию очистки. */
export function attachTilt(el: HTMLElement, max = 6) {
  if (!finePointer() || reducedMotion()) return () => {};
  const setX = gsap.quickTo(el, "rotationX", { duration: 0.4, ease: "power2.out" });
  const setY = gsap.quickTo(el, "rotationY", { duration: 0.4, ease: "power2.out" });
  gsap.set(el, { transformPerspective: 1000, transformOrigin: "50% 50%" });
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setX(-py * max * 2);
    setY(px * max * 2);
  };
  const enter = () => gsap.to(el, { y: -6, duration: 0.4, ease: "power2.out" });
  const leave = () =>
    gsap.to(el, { rotationX: 0, rotationY: 0, y: 0, duration: 0.6, ease: EASE, overwrite: "auto" });
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);
  return () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerenter", enter);
    el.removeEventListener("pointerleave", leave);
  };
}

/** Плавный скролл к якорю (с учётом reduced motion). */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}
