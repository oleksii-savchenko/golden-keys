"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";
import { reducedMotion } from "@/lib/anim";

type Props = {
  mp4: string;
  webm?: string;
  poster?: string;
  className?: string;
  style?: CSSProperties;
  /** первый экран — грузить сразу */
  eager?: boolean;
  /** сам управляет play/pause по видимости (по умолчанию да) */
  autoPlay?: boolean;
  /** при reduced motion показывать только постер (для фоновых) */
  decorative?: boolean;
  muted?: boolean;
};

/**
 * Видео, которое подставляет источники за ~300px до появления и играет только пока видно.
 * reduced motion → только постер (для декоративных).
 */
const LazyVideo = forwardRef<HTMLVideoElement, Props>(function LazyVideo(
  { mp4, webm, poster, className, style, eager = false, autoPlay = true, decorative = true, muted = true },
  ref,
) {
  const v = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => v.current as HTMLVideoElement);

  useEffect(() => {
    const video = v.current;
    if (!video) return;
    if (decorative && reducedMotion()) return;
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      video.querySelectorAll<HTMLSourceElement>("source[data-src]").forEach((s) => {
        s.src = s.dataset.src!;
      });
      video.load();
    };
    if (eager) load();
    const near = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          load();
          near.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    if (!eager) near.observe(video);

    let vis: IntersectionObserver | undefined;
    if (autoPlay) {
      vis = new IntersectionObserver(
        (es) => {
          const on = es.some((e) => e.isIntersecting);
          if (on) {
            load();
            video.play().catch(() => {});
          } else video.pause();
        },
        { threshold: 0.05 },
      );
      vis.observe(video);
    }
    return () => {
      near.disconnect();
      vis?.disconnect();
    };
  }, [eager, autoPlay, decorative]);

  return (
    <video
      ref={v}
      className={className}
      style={style}
      muted={muted}
      loop
      playsInline
      preload={eager ? "auto" : "none"}
      poster={poster}
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    >
      {webm && <source data-src={webm} type="video/webm" />}
      <source data-src={mp4} type="video/mp4" />
    </video>
  );
});

export default LazyVideo;
