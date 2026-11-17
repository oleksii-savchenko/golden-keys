"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, reducedMotion } from "@/lib/anim";
import { stats } from "@/content/site";
import s from "./Numbers.module.css";

// Figma 15:3 «2 block numbers» (y 1164–1396), мобила 9:476…9:520 (y 767–1210)
// мобила: пары в 2 колонки; если «обычных» пунктов нечётное число — последний из них на всю ширину
const regular = stats.map((st, i) => (st.mobileWide ? -1 : i)).filter((i) => i >= 0);
const loneLast = regular.length % 2 === 1 ? regular[regular.length - 1] : -1;

export default function Numbers() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-stat]"));
    const rm = reducedMotion();
    const ctx = gsap.context(() => {
      const nums = items.map((it) => it.querySelector<HTMLElement>("[data-num]")!);
      const extras = items.map((it) => it.querySelectorAll<HTMLElement>("[data-after]"));
      const caps = el.querySelectorAll<HTMLElement>("[data-cap]");
      const allExtras = el.querySelectorAll<HTMLElement>("[data-after]");
      const values = items.map((it) => Number(it.dataset.stat));

      // начальное состояние
      const reset = () => {
        nums.forEach((n) => (n.textContent = "0"));
        gsap.set(allExtras, { autoAlpha: 0 });
        gsap.set(caps, { autoAlpha: 0, y: rm ? 0 : 16 });
      };
      reset();

      let tl: gsap.core.Timeline | null = null;
      const play = () => {
        tl?.kill();
        reset();
        tl = gsap.timeline();
        items.forEach((_, i) => {
          const o = { v: 0 };
          const dur = rm ? 0.01 : values[i] < 10 ? 1 : 1.8;
          tl!.to(
            o,
            {
              v: values[i],
              duration: dur,
              ease: "power3.out",
              onUpdate: () => (nums[i].textContent = String(Math.round(o.v))),
            },
            rm ? 0 : i * 0.08,
          );
          // «+» и «/7» — по окончании счёта
          if (extras[i].length) tl!.to(extras[i], { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, ">-0.15");
        });
        // подписи — плавно после цифр
        tl.to(caps, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.05 }, rm ? 0 : 0.9);
      };

      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        end: "bottom 10%",
        onEnter: play,
        onEnterBack: play,
        onLeave: () => tl?.kill(),
        onLeaveBack: () => {
          tl?.kill();
          reset();
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={s.section} aria-label="Містечко в цифрах">
      <ul className={s.grid}>
        {stats.map((st, i) => (
          <li key={i} className={`${s.item} ${st.mobileWide || i === loneLast ? s.wide : ""}`} data-stat={st.value}>
            <p className={s.num}>
              <span className="sr-only">
                {st.value}
                {st.suffix ?? ""}
                {st.plus ? "+" : ""} {st.unit}
              </span>
              <span aria-hidden="true">
                <span data-num>{st.value}</span>
                {st.suffix && <span data-after>{st.suffix}</span>}
                {st.plus && (
                  <span className={s.plus} data-after>
                    +
                  </span>
                )}
              </span>
            </p>
            <p className={s.unit} data-cap aria-hidden="true">
              {st.unit}
            </p>
            <p className={s.text} data-cap>
              {st.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
