"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, reducedMotion, isMobile } from "@/lib/anim";
import { hero, media } from "@/content/site";
import { useFitTitle } from "./useFitTitle";
import LazyVideo from "./LazyVideo";
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

  useEffect(() => {
    const el = root.current!;
    (window as unknown as { __heroStarted?: boolean }).__heroStarted = true;
    const q = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
    const pending = q("[data-pending]");
    const rm = reducedMotion();
    const mobile = isMobile();

    const ctx = gsap.context(() => {
      const title = q("[data-h='title']");
      const sub = q("[data-h='sub']");
      const logo = el.querySelector<SVGSVGElement>("[data-h='logo'] svg");
      const bottom = q("[data-h='bottom']");
      gsap.set(pending, { autoAlpha: 0 });
      pending.forEach((n) => n.removeAttribute("data-pending"));

      if (rm) {
        gsap.to(pending, { autoAlpha: 1, duration: 0.6, ease: "power1.out", stagger: 0.08 });
        return;
      }

      // всё раскрывается примерно за 1,6 с, порядок прежний (отметки времени — абсолютные)
      const tl = gsap.timeline({ delay: 0.05 });
      // 1. «Золоті Ключі» — проявляется из блюра
      tl.fromTo(
        title,
        { autoAlpha: 0, filter: `blur(${mobile ? 8 : 18}px)`, y: 24, scale: 1.02 },
        { autoAlpha: 1, filter: "blur(0px)", y: 0, scale: 1, duration: 0.85, ease: "power3.out", clearProps: "filter,transform" },
        0,
      );
      // 2. подзаголовок
      tl.fromTo(
        sub,
        { autoAlpha: 0, y: 16, filter: mobile ? "none" : "blur(5px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.65, ease: "power3.out", clearProps: "filter,transform" },
        0.3,
      );
      // 3. логотип — прорисовка по линиям, затем заливка
      if (logo) {
        tl.set(logo.parentElement, { autoAlpha: 1 }, 0.4);
        tl.add(drawLogo(logo, { duration: 0.95 }), 0.4);
      }
      // 4. низ: локация, «за 25 секунд» + play, кнопка
      tl.fromTo(
        bottom,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.07, clearProps: "transform" },
        0.7,
      );

      // логотип прорисовывается заново каждый раз, когда возвращаемся к первому экрану
      if (logo) {
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
      }
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={s.hero} aria-label={hero.title}>
      <div className={s.card}>
        <div className={s.bg} aria-hidden="true" style={{ "--poster": `url("${media.hero.poster}")` } as React.CSSProperties}>
          <LazyVideo mp4={media.hero.mp4} poster={media.hero.poster} eager className={s.video} />
          <span className={s.shade} />
        </div>

        <div className={s.logo} data-h="logo" data-pending>
          <Svg name="logo" title={`Логотип ${hero.title}`} />
        </div>

        <h1 ref={titleRef} className={s.title} data-h="title" data-pending>
          {titleWords.map((w, i) => (
            <span key={i}>
              {i > 0 && " "}
              {w}
            </span>
          ))}
        </h1>

        <p className={s.sub} data-h="sub" data-pending>
          {hero.subtitle}
        </p>

        <p className={s.location} data-h="bottom" data-pending>
          {hero.location.map((l) => (
            <span key={l} className={s.line}>
              {l}
            </span>
          ))}
        </p>

        <div className={s.about} data-h="bottom" data-pending>
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

        <div className={s.cta} data-h="bottom" data-pending>
          <Button w={453} href={hero.ctaLink} external={/^https?:/.test(hero.ctaLink)}>
            {hero.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
