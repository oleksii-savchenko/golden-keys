import { gsap } from "@/lib/anim";

/**
 * Прорисовка логотипа по линиям: у каждого контура белая обводка «рисуется» (stroke-dashoffset),
 * затем появляется заливка, а обводка растворяется. Возвращает timeline.
 */
export function drawLogo(svgEl: SVGSVGElement, { duration = 1.5, stroke = "#ffffff", width = 0.9 } = {}) {
  const paths = Array.from(svgEl.querySelectorAll<SVGGeometryElement>("path, circle, rect"));
  const tl = gsap.timeline();
  paths.forEach((p) => {
    const len = Math.ceil(p.getTotalLength?.() ?? 0) + 1;
    gsap.set(p, {
      attr: { stroke, "stroke-width": width, "stroke-dasharray": len, "stroke-dashoffset": len },
      fillOpacity: 0,
    });
  });
  tl.to(paths, { attr: { "stroke-dashoffset": 0 }, duration, ease: "power2.inOut", stagger: duration * 0.03 });
  tl.to(paths, { fillOpacity: 1, duration: 0.7, ease: "power2.out" }, `-=${duration * 0.35}`);
  tl.to(paths, { attr: { "stroke-width": 0 }, duration: 0.5, ease: "power1.out" }, "<0.3");
  tl.add(() => paths.forEach((p) => p.removeAttribute("stroke")));
  return tl;
}
