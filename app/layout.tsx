import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SITE_URL } from "@/lib/straten";
import Matomo from "@/components/Matomo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Straten van Gouda — de geschiedenis achter elke straatnaam",
    template: "%s — Straten van Gouda",
  },
  description:
    "Ontdek waar Goudse straatnamen vandaan komen: herkomst, betekenis en historisch beeldmateriaal, verzorgd door Historische Vereniging Die Goude en het Streekarchief Midden-Holland.",
  icons: { icon: "/favicon.svg" },
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
      </body>
    </html>
  );
}
