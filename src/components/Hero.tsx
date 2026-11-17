"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, reducedMotion } from "@/lib/anim";
import { hero } from "@/content/site";
import { useFitTitle } from "./useFitTitle";
import HeroBg from "./HeroBg";
import VideoCircle from "./VideoCircle";
import Button from "./Button";
import Svg from "./Svg";
import { drawLogo } from "./drawLogo";
import s from "./Hero.module.css";

// Figma 1:2 «1 block hero» (x14 y10, 1892×1050), мобила 8:237 (0–715)
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleWords = hero.title.split(/\s+/).filter(Boolean);
  // заголовок любой длины встаёт ровно по граням: десктоп — 1750 из 1892 (от «Дніпро» до края play), мобила — 350 из 390
  useFitTitle(titleRef, { desktop: 1750 / 1892, mobile: 350 / 390, mobileMax: 103 / 390 });

  // Появление текста и кнопок — CSS-анимации (стартуют с первой отрисовкой, не ждут JS; см. Hero.module.css).
  // На JS остаётся только прорисовка логотипа: ей нужны длины контуров.
  useEffect(() => {
    const el = root.current!;
    (window as unknown as { __heroStarted?: boolean }).__heroStarted = true;
    const wrap = el.querySelector<HTMLElement>("[data-h='logo']")!;
    const logo = wrap.querySelector<SVGSVGElement>("svg");
    const rm = reducedMotion();

    const ctx = gsap.context(() => {
      gsap.set(wrap, { autoAlpha: 0 });
      wrap.removeAttribute("data-pending");
      if (rm || !logo) {
        gsap.to(wrap, { autoAlpha: 1, duration: 0.6, ease: "power1.out" });
        return;
      }
      const tl = gsap.timeline({ delay: 0.35 });
      tl.set(wrap, { autoAlpha: 1 });
      tl.add(drawLogo(logo, { duration: 0.95 }));

      // логотип прорисовывается заново каждый раз, когда возвращаемся к первому экрану
      let redraw: gsap.core.Timeline | null = null;
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom 85%",
        onEnterBack: () => {
          tl.progress(1);
          redraw?.kill();
          redraw = drawLogo(logo, { duration: 1.1 });
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={s.hero} aria-label={hero.title}>
      <div className={s.card}>
        <div className={s.bg} aria-hidden="true">
          <HeroBg imgClassName={s.video} videoClassName={`${s.video} ${s.videoLayer}`} />
          <span className={s.shade} />
        </div>

        <div className={s.logo} data-h="logo" data-pending>
          <Svg name="logo" title={`Логотип ${hero.title}`} />
        </div>

        <h1 ref={titleRef} className={s.title} data-h="title">
          {titleWords.map((w, i) => (
            <span key={i}>
              {i > 0 && " "}
              {w}
            </span>
          ))}
        </h1>

        <p className={s.sub} data-h="sub">
          {hero.subtitle}
        </p>

        <p className={s.location} data-h="bottom">
          {hero.location.map((l) => (
            <span key={l} className={s.line}>
              {l}
            </span>
          ))}
        </p>

        <div className={s.about} data-h="bottom">
          <p className={s.aboutText}>
            {hero.about.map((l) => (
              <span key={l} className={s.line}>
                {l}
              </span>
            ))}
          </p>
          {hero.aboutVideo && (
            <VideoCircle mp4={hero.aboutVideo} poster={hero.aboutPoster} label={hero.aboutLabel} className={s.play} />
          )}
        </div>

        <div className={s.cta} data-h="bottom">
          <Button w={453} href={hero.ctaLink} external={/^https?:/.test(hero.ctaLink)}>
            {hero.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
