"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap, reducedMotion } from "@/lib/anim";
import { privacy } from "@/content/site";
import s from "./PrivacyModal.module.css";

type Props = { open: boolean; onClose: () => void };

/** Попап «Політика конфіденційності»: крестик, клик вне окна, Esc; внутри скролл, страница не скроллится. */
export default function PrivacyModal({ open, onClose }: Props) {
  const overlay = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = sbw ? `${sbw}px` : "";
    document.body.classList.add("is-locked");
    const rm = reducedMotion();
    gsap.fromTo(overlay.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: rm ? 0.01 : 0.3, ease: "power1.out" });
    gsap.fromTo(
      box.current,
      { y: rm ? 0 : 40, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: rm ? 0.01 : 0.5, ease: "power3.out" },
    );
    closeBtn.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && box.current) {
        // фокус не выходит из окна
        const f = box.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
      document.body.style.paddingRight = "";
      lastFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlay}
      className={s.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={box} className={s.box} role="dialog" aria-modal="true" aria-labelledby="privacy-title">
        <button ref={closeBtn} type="button" className={s.close} onClick={onClose} aria-label="Закрити">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
        <div className={s.scroll} tabIndex={0}>
          <h2 id="privacy-title" className={s.title}>
            {privacy.title}
          </h2>
          <p className={s.date}>{privacy.updated}</p>
          {/* текст из админки (визуальный редактор, HTML) */}
          <div className={s.body} dangerouslySetInnerHTML={{ __html: privacy.html }} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
