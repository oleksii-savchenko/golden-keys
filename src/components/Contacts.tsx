"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, reducedMotion, isMobile } from "@/lib/anim";
import { contacts, media } from "@/content/site";
import LazyVideo from "./LazyVideo";
import Svg from "./Svg";
import { drawLogo } from "./drawLogo";
import s from "./Contacts.module.css";

// Figma 15:8 «6 block contacts» (x13 y5030, 1892×1018), мобила y 5072–5757
export default function Contacts() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    const rm = reducedMotion();
    const mobile = isMobile();
    const ctx = gsap.context(() => {
      const words = el.querySelectorAll("[data-c='word']");
      const logoWrap = el.querySelector<HTMLElement>("[data-c='logo']")!;
      const logo = logoWrap.querySelector("svg")!;
      const items = el.querySelectorAll("[data-c='item']");
      gsap.set([words, logoWrap, items], { autoAlpha: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 65%", once: true },
      });
      if (rm) {
        tl.to([words, logoWrap, items], { autoAlpha: 1, duration: 0.6, stagger: 0.06 });
        return;
      }
      // 1. «Золоті / Ключі» вместе с логотипом — как в hero
      tl.fromTo(
        words,
        { autoAlpha: 0, filter: `blur(${mobile ? 10 : 20}px)`, y: 30 },
        { autoAlpha: 1, filter: "blur(0px)", y: 0, duration: 1.2, ease: "power3.out", stagger: 0.12, clearProps: "filter,transform" },
      );
      tl.set(logoWrap, { autoAlpha: 1 }, 0.1);
      tl.add(drawLogo(logo, { duration: 1.3 }), 0.1);
      // 2. контакты
      tl.fromTo(
        items,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, clearProps: "transform" },
        0.9,
      );

      // логотип прорисовывается заново при каждом возвращении к блоку (сверху или снизу)
      let redraw: gsap.core.Timeline | null = null;
      const again = () => {
        if (tl.progress() === 0) return; // первый раз — основная анимация
        tl.progress(1);
        redraw?.kill();
        redraw = drawLogo(logo, { duration: 1.3 });
      };
      let first = true;
      ScrollTrigger.create({
        trigger: el,
        start: "top 65%",
        end: "bottom 35%",
        onEnter: () => {
          if (first) {
            first = false;
            return;
          }
          again();
        },
        onEnterBack: again,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={s.section} id="contacts" aria-labelledby="contacts-title">
      <div className={s.card}>
        <div className={s.bg} aria-hidden="true" style={{ "--poster": `url("${media.contacts.poster}")` } as React.CSSProperties}>
          <LazyVideo mp4={media.contacts.mp4} poster={media.contacts.poster} className={s.video} />
          <span className={s.shade} />
        </div>

        <h2 id="contacts-title" className={s.title}>
          <span className={s.word} data-c="word">
            {contacts.left}
          </span>{" "}
          <span className={s.logo} data-c="logo">
            <Svg name="logo" />
          </span>{" "}
          <span className={s.word} data-c="word">
            {contacts.right}
          </span>
        </h2>

        <ul className={s.list}>
          {contacts.items.map((c) => (
            <li key={c.href} className={s.item} data-c="item">
              <a href={c.href} className={s.link} {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <span className={`${s.big} u-line`}>{c.title}</span>
                <span className={s.small}>{c.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
