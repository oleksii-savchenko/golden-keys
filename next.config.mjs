// На GitHub Pages без своего домена сайт живёт в подпапке /<repo> — её передаёт сборка (NEXT_PUBLIC_BASE_PATH).
// Со своим доменом (CNAME) подпапки нет и переменная пустая.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  basePath,
};

export default nextConfig;
