"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, reducedMotion, finePointer } from "@/lib/anim";
import s from "./VideoCircle.module.css";

type Props = { mp4: string; poster?: string; label: string; className?: string };

const GROW = 2.5;

/**
 * Кнопка play, которая по клику вырастает ×2.5 в круглое видео со звуком (как кружок в Telegram)
 * с кольцом прогресса; повторный клик — стоп и обратно в кнопку.
 * Круг всегда в «большом» размере и уменьшен scale(0.4) — так видео остаётся чётким.
 * Слот держит размер кнопки, круг растёт поверх соседей.
 */
export default function VideoCircle({ mp4, poster, label, className }: Props) {
  const circle = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const [open, setOpen] = useState(false);

  // кольцо прогресса
  useEffect(() => {
    const v = video.current;
    const r = ring.current;
    if (!v || !r) return;
    let raf = 0;
    const tick = () => {
      if (v.duration) r.style.strokeDashoffset = String(1 - v.currentTime / v.duration);
      raf = requestAnimationFrame(tick);
    };
    if (open) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // hover — чуть больше (только мышь, только в закрытом состоянии)
  useEffect(() => {
    const el = circle.current;
    if (!el) return;
    // x/y обнуляем: иначе GSAP читает CSS translate(-50%) как px и сдвигает круг дважды
    gsap.set(el, { x: 0, y: 0, xPercent: -50, yPercent: -50, scale: 1 / GROW });
    if (!finePointer()) return;
    const enter = () => !el.classList.contains(s.open) && gsap.to(el, { scale: (1 / GROW) * 1.08, duration: 0.4, ease: "power2.out" });
    const leave = () => !el.classList.contains(s.open) && gsap.to(el, { scale: 1 / GROW, duration: 0.5, ease: "power3.out" });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  const close = () => {
    const v = video.current;
    if (v) {
      v.pause();
    }
    setOpen(false);
    gsap.to(circle.current, { scale: 1 / GROW, duration: reducedMotion() ? 0 : 0.6, ease: "power3.inOut" });
  };

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (open) return close();
    if (!v.src) {
      v.src = mp4;
      v.load();
    }
    v.currentTime = 0;
    v.muted = false;
    v.play().catch(() => {
      // без звука браузер может запретить — пробуем беззвучно
      v.muted = true;
      v.play().catch(() => {});
    });
    setOpen(true);
    gsap.to(circle.current, { scale: 1, duration: reducedMotion() ? 0 : 0.7, ease: "power3.inOut" });
  };

  // закрыть, когда уехали со страницы видео / закончилось
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const end = () => close();
    v.addEventListener("ended", end);
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting && !v.paused) close();
    });
    io.observe(circle.current!);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !v.paused && close();
    window.addEventListener("keydown", esc);
    return () => {
      v.removeEventListener("ended", end);
      io.disconnect();
      window.removeEventListener("keydown", esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className={`${s.slot} ${className ?? ""}`}>
      <button
        ref={circle}
        type="button"
        className={`${s.circle} ${open ? s.open : ""}`}
        onClick={toggle}
        aria-label={open ? "Зупинити відео" : label}
        aria-pressed={open}
      >
        <video ref={video} className={s.video} playsInline preload="none" poster={poster} />
        <svg className={s.ring} viewBox="0 0 100 100" aria-hidden="true">
          <circle ref={ring} cx="50" cy="50" r="48.5" pathLength={1} />
        </svg>
        <span className={s.face} aria-hidden="true">
          <svg viewBox="0 0 105 105" className={s.icon}>
            <path
              d="M56.7479 51.2007C57.7485 51.778 57.7485 53.222 56.7479 53.7993L48.2496 58.7022C47.2496 59.2791 46 58.5574 46 57.4029L46 47.5971C46 46.4426 47.2496 45.7209 48.2496 46.2978L56.7479 51.2007Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </button>
    </span>
  );
}
