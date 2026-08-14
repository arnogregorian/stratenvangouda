import type { NextConfig } from "next";

// Volledig statische export: de site kan op elke webserver (nginx/Apache) van
// Die Goude geserveerd worden zonder Node.js-proces. Zie README voor deployment.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
