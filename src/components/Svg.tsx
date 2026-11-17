import type { SVGProps } from "react";
import { svg, type SvgName } from "./svg/markup";

type Props = { name: SvgName; title?: string } & Omit<SVGProps<SVGSVGElement>, "dangerouslySetInnerHTML">;

/** Инлайн-SVG из Figma (разметка сгенерирована scripts/images.mjs). */
export default function Svg({ name, title, ...rest }: Props) {
  const s = svg[name];
  return (
    <svg
      viewBox={s.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
      dangerouslySetInnerHTML={{ __html: s.body }}
    />
  );
}
