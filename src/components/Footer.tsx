"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, reveal } from "@/lib/anim";
import { footer, links } from "@/content/site";
import Svg from "./Svg";
import PrivacyModal from "./PrivacyModal";
import s from "./Footer.module.css";

// Figma 15:9 «Footer» (y 6146–6217), мобила y 5825–6117
export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = root.current!;
    const ctx = gsap.context(() => {
      reveal(el.querySelectorAll("[data-r]"), { trigger: el, stagger: 0.1, y: 24, start: "top 95%" });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <footer ref={root} className={s.footer}>
      <div className={s.brand} data-r>
        <Svg name="logoDark" className={s.logo} />
        <p>
          <span className={s.name}>{footer.name}</span>
          <span className={s.sub}>{footer.sub}</span>
        </p>
      </div>

      <button type="button" className={s.policy} onClick={() => setOpen(true)} data-r aria-haspopup="dialog">
        <span className="u-line">{footer.privacy}</span>
      </button>

      <a className={s.dev} href={links.hawk} target="_blank" rel="noopener" data-r>
        <span>{footer.dev[0]}</span>
        <span className={s.devName}>
          <Svg name="hawk" className={s.hawk} />
          <span className={s.reg} aria-hidden="true">
            ®
          </span>
          <span className="u-line">{footer.dev[1]}</span>
        </span>
      </a>

      <PrivacyModal open={open} onClose={() => setOpen(false)} />
    </footer>
  );
}
