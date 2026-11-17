"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, reveal, reducedMotion, attachTilt, isMobile } from "@/lib/anim";
import { objects, type Listing, type TabId } from "@/content/site";
import Svg from "./Svg";
import s from "./Objects.module.css";

// Figma 15:4 «3 block objects» (y 1616–2621), «Оренда» 21:420; мобила y 1283–3112
export default function Objects() {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const spinBtn = useRef<HTMLButtonElement>(null);
  const spinning = useRef<gsap.core.Timeline | null>(null);

  // логотип в лейбле: переворачивается вокруг своей вертикальной оси (как монета) пару раз и встаёт на место
  const spinLogo = () => {
    const el = spinBtn.current?.querySelector("svg");
    if (!el || spinning.current?.isActive()) return;
    if (reducedMotion()) return;
    spinning.current = gsap
      .timeline({ onComplete: () => void gsap.set(el, { rotationY: 0 }) })
      .set(el, { transformPerspective: 600, transformOrigin: "50% 50%" })
      .to(el, { rotationY: 720, duration: 1.5, ease: "power3.inOut" });
  };
  const firstTab: TabId = objects.tabs[0]?.id ?? "sale";
  const [tab, setTab] = useState<TabId>(firstTab);
  const [shown, setShown] = useState<TabId>(firstTab);
  const firstRender = useRef(true);

  // появление блока + вращение лейбла
  useEffect(() => {
    const el = root.current!;
    const ctx = gsap.context(() => {
      reveal(el.querySelectorAll("[data-r='head']"), { trigger: el, stagger: 0.12 });
      reveal(el.querySelectorAll("[data-r='tabs']"), { trigger: el.querySelector("[data-r='tabs']"), delay: 0.1 });
      reveal(el.querySelectorAll("[data-card]"), { trigger: grid.current, stagger: 0.12 });

      // текст по кругу крутится всегда; скролл ускоряет, затем скорость плавно возвращается
      if (!reducedMotion() && ring.current) {
        const spin = gsap.to(ring.current, { rotation: 360, duration: 18, ease: "none", repeat: -1 });
        const boost = { v: 1 };
        let back: gsap.core.Tween | null = null;
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const v = Math.abs(self.getVelocity());
            const target = Math.min(1 + v / 180, 9);
            if (target > boost.v) {
              boost.v = target;
              spin.timeScale(boost.v);
            }
            back?.kill();
            back = gsap.to(boost, {
              v: 1,
              duration: 1.6,
              ease: "power2.out",
              delay: 0.05,
              onUpdate: () => {
                spin.timeScale(boost.v);
              },
            });
          },
        });
      }
    }, el);
    return () => ctx.revert();
  }, []);

  // 3D-наклон карточек
  useEffect(() => {
    const cards = Array.from(grid.current!.querySelectorAll<HTMLElement>("[data-tilt]"));
    const offs = cards.map((c) => attachTilt(c, 5));
    return () => offs.forEach((f) => f());
  }, [shown]);

  // смена вкладки: старые карточки растворяются, новые появляются по очереди
  const switchTo = (id: TabId) => {
    if (id === tab) return;
    setTab(id);
    const cards = grid.current!.querySelectorAll("[data-card]");
    if (reducedMotion()) {
      gsap.to(cards, { autoAlpha: 0, duration: 0.2, onComplete: () => setShown(id) });
      return;
    }
    gsap.to(cards, {
      autoAlpha: 0,
      y: -12,
      duration: 0.3,
      ease: "power2.in",
      stagger: 0.04,
      onComplete: () => setShown(id),
    });
  };

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const cards = grid.current!.querySelectorAll("[data-card]");
    const rm = reducedMotion();
    gsap.fromTo(
      cards,
      { autoAlpha: 0, y: rm ? 0 : isMobile() ? 16 : 24 },
      { autoAlpha: 1, y: 0, duration: rm ? 0.3 : 0.6, ease: "power3.out", stagger: rm ? 0 : 0.08, clearProps: "transform" },
    );
    ScrollTrigger.refresh();
  }, [shown]);

  const shownTab = objects.tabs.find((t) => t.id === shown);
  const list: Listing[] = shownTab?.items ?? [];
  const activeIndex = objects.tabs.findIndex((t) => t.id === tab);

  return (
    <section ref={root} className={s.section} id="objects" aria-labelledby="objects-title" data-anchor>
      <div className={s.head}>
        <h2 id="objects-title" className={s.title} data-r="head">
          {objects.title}
        </h2>
        <div className={s.label} data-r="head">
          <div ref={ring} className={s.ring} aria-hidden="true">
            <Svg name="labelRing" />
          </div>
          {/* мини-интерактив: по клику логотип делает пару оборотов и останавливается */}
          <button type="button" ref={spinBtn} className={s.labelBtn} onClick={spinLogo} aria-label="Покрутити логотип">
            <Svg name="labelLogo" />
          </button>
        </div>
        <p className={s.text} data-r="head">
          {objects.text}
        </p>
      </div>

      {objects.tabs.length > 1 && (
      <div className={s.tabs} role="tablist" aria-label="Тип пропозиції" data-r="tabs" style={{ "--i": activeIndex } as React.CSSProperties}>
        <span className={s.plate} aria-hidden="true" />
        {objects.tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="objects-panel"
            className={`${s.tab} ${tab === t.id ? s.tabActive : ""}`}
            onClick={() => switchTo(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      )}

      <ul ref={grid} className={s.grid} id="objects-panel" role="tabpanel" aria-labelledby={objects.tabs.length > 1 ? `tab-${tab}` : "objects-title"}>
        {list.map((o, i) => (
          <li key={`${shown}-${i}`} className={s.cell} data-card>
            <a className={s.card} href={o.link} target="_blank" rel="noopener noreferrer" data-tilt>
              <span className={s.media}>
                {o.img && <img src={o.img} alt={o.alt} width={1100} height={609} loading="lazy" decoding="async" />}
                {shownTab?.label && <span className={s.badge}>{shownTab.label}</span>}
              </span>
              <span className={s.name}>{o.title}</span>
              <span className={s.stats}>
                {o.area && (
                <span className={s.stat}>
                  <span className={s.value}>{o.area}</span>
                  <span className={s.key}>
                    <span className={s.ico}>
                      <Svg name="icoArea" />
                    </span>
                    {objects.labelArea}
                  </span>
                </span>
                )}
                {o.plot && (
                <span className={s.stat}>
                  <span className={s.value}>{o.plot}</span>
                  <span className={s.key}>
                    <span className={s.ico}>
                      <Svg name="icoPlot" />
                    </span>
                    {objects.labelPlot}
                  </span>
                </span>
                )}
              </span>
              <span className={s.more}>
                <span className="u-line u-line--on">{objects.more}</span>
                <Svg name="arrow" className={s.moreArrow} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
