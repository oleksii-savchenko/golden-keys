import localFont from "next/font/local";

export const interTight = localFont({
  src: [
    { path: "../fonts/inter-tight-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/inter-tight-cyrillic-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter-tight",
  display: "swap",
});
