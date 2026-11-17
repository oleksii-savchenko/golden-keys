"use client";

import { useEffect, useRef } from "react";
import { gsap, reveal } from "@/lib/anim";
import { telegram, links, media } from "@/content/site";
import LazyVideo from "./LazyVideo";
import Button from "./Button";
import Svg from "./Svg";
import s from "./Telegram.module.css";

// Figma 15:5 «4 block» (x14 y2786, 1892×806), мобила y 3156–4102
export default function Telegram() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    const ctx = gsap.context(() => {
      reveal(el.querySelector("[data-r='video']"), { trigger: el, y: 30 });
      // заголовок → три пункта → кнопка и подпись
      const seq = gsap.utils.toArray<HTMLElement>(el.querySelectorAll("[data-r='seq']"));
      reveal(seq, { trigger: el.querySelector("[data-r='content']"), stagger: 0.14, start: "top 80%" });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={s.section} aria-labelledby="tg-title">
      <div className={s.card}>
        <div className={s.video} data-r="video">
          <LazyVideo mp4={media.telegram.mp4} poster={media.telegram.poster} />
        </div>
        <div className={s.content} data-r="content">
          <h2 id="tg-title" className={s.title} data-r="seq">
            {telegram.title.map((l) => (
              <span key={l} className={s.line}>
                {l}
              </span>
            ))}
          </h2>
          <ul className={s.features}>
            {telegram.features.map((f, i) => (
              <li key={i} className={s.feature} data-r="seq">
                <span className={s.ico}>
                  <Svg name={f.icon} />
                </span>
                <span>
                  {f.text.map((l) => (
                    <span key={l} className={s.line}>
                      {l}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <div className={s.actions} data-r="seq">
            <Button w={419} href={links.telegram} external>
              {telegram.cta}
            </Button>
            <p className={s.note}>
              {telegram.note.map((l) => (
                <span key={l} className={s.line}>
                  {l}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
