"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/content/site";
import { reducedMotion } from "@/lib/anim";

type Props = { className?: string; imgClassName?: string; videoClassName?: string };

/**
 * Фон первого экрана, оптимизированный под скорость (LCP):
 *  • сразу показывается адаптивная картинка (мобила — кадр 9:16, 37 КБ; десктоп — 1600 px);
 *  • видео начинает грузиться только после полной загрузки страницы и плавно проявляется поверх картинки;
 *  • на телефоне — отдельное лёгкое видео 540×960 (~0,9 МБ вместо 3 МБ);
 *  • reduced motion — только картинка.
 */
export default function HeroBg({ imgClassName, videoClassName }: Props) {
  const v = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const video = v.current;
    if (!video || reducedMotion()) return;
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      video.src = asset(mobile ? "/media/bg/hero-m.mp4" : "/media/bg/hero.mp4");
      video.load();
      video.play().catch(() => {});
    };
    // после load + небольшая пауза, чтобы видео не отнимало канал у первого экрана
    const later = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback;
      if (ric) ric(start, { timeout: 2500 });
      else setTimeout(start, 800);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });

    // играет только пока первый экран виден
    const io = new IntersectionObserver(
      (es) => {
        if (!video.src) return;
        if (es[0].isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(video);
    const onPlaying = () => setShown(true);
    video.addEventListener("playing", onPlaying);
    return () => {
      cancelled = true;
      window.removeEventListener("load", later);
      io.disconnect();
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  return (
    <>
      <picture>
        <source media="(max-width: 767px)" srcSet={asset("/media/bg/hero-m.webp")} width={540} height={960} />
        <img
          src={asset("/media/bg/hero.webp")}
          alt=""
          width={1600}
          height={900}
          className={imgClassName}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <video
        ref={v}
        className={videoClassName}
        style={{ opacity: shown ? 1 : 0 }}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      />
    </>
  );
}
