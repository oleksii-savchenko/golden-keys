import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import Svg from "./Svg";
import s from "./Button.module.css";

type Props = {
  children: string;
  href?: string;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  /** ширина на десктопе в px макета (453 / 419 / 412) */
  w: number;
  className?: string;
};

/**
 * Жёлтая кнопка с белым квадратом и стрелкой.
 * Hover: кнопка становится белой, квадрат заливается тёмным снизу, стрелка белеет и поворачивается в ↗;
 * буквы текста быстро и невысоко «подпрыгивают» волной (один раз на наведение).
 */
export default function Button({ children, href, external, onClick, w, className }: Props) {
  const style = { "--bw": w } as CSSProperties;
  const inner: ReactNode = (
    <>
      <span className={s.label}>
        <span className="sr-only">{children}</span>
        <span className={s.text} aria-hidden="true">
          {Array.from(children).map((ch, i) => (
            <span key={i} className={s.ch} style={{ "--i": i } as CSSProperties}>
              {ch === " " ? " " : ch}
            </span>
          ))}
        </span>
      </span>
      <span className={s.square} aria-hidden="true">
        <Svg name="arrow" className={s.arrow} />
      </span>
    </>
  );
  const cls = `${s.btn} ${className ?? ""}`;
  if (href) {
    return (
      <a
        href={href}
        className={cls}
        style={style}
        onClick={onClick}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} style={style} onClick={onClick}>
      {inner}
    </button>
  );
}
