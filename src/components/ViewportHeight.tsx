"use client";

import { useEffect } from "react";

/**
 * --svh = 1% высоты окна (на тач-экранах фиксируется до смены ширины — не прыгает во встроенных браузерах),
 * --vw  = 1% ширины без полосы прокрутки (чтобы масштаб от 1920 не давал горизонтальный скролл).
 */
export default function ViewportHeight() {
  useEffect(() => {
    const root = document.documentElement;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    let width = window.innerWidth;
    const setH = () => root.style.setProperty("--svh", `${window.innerHeight * 0.01}px`);
    const setW = () => root.style.setProperty("--vw", `${root.clientWidth * 0.01}px`);
    setH();
    setW();
    const onResize = () => {
      setW();
      if (touch && window.innerWidth === width) return;
      width = window.innerWidth;
      setH();
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(setW); // появление/исчезновение полосы прокрутки
    ro.observe(root);
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);
  return null;
}
