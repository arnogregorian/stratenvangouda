import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SITE_URL, OG_STANDAARD } from "@/lib/straten";
import Matomo from "@/components/Matomo";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Straten van Gouda",
  title: {
    default: "Straten van Gouda — de geschiedenis achter elke straatnaam",
    template: "%s — Straten van Gouda",
  },
  description:
    "Ontdek waar Goudse straatnamen vandaan komen: herkomst, betekenis en historisch beeldmateriaal, verzorgd door Historische Vereniging Die Goude en het Streekarchief Midden-Holland.",
  // Standaard-deelafbeelding voor alle pagina's zonder eigen openGraph-blok
  // (startpagina, hulp, colofon). Straatpagina's zetten een eigen blok en
  // vallen terug op dezelfde afbeelding als een straat geen foto heeft.
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "Straten van Gouda",
    url: "/",
    images: [{ url: OG_STANDAARD, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_STANDAARD],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Straten van Gouda",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d32016",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>
        <a href="#inhoud" className="skip-link">
          Direct naar inhoud
        </a>
        {children}
        <Matomo />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
