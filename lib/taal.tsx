"use client";

/**
 * Lichte UI-vertaling (app-schil van de homepage) NL ⇄ EN. De inhoud van de
 * straatpagina's komt Nederlandstalig uit het archief en wordt niet vertaald.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Taal = "nl" | "en" | "de" | "fr";

export type Teksten = {
  welkom: string;
  sluiten: string;
  introTekst: string;
  introHint: string;
  startOpLocatie: string;
  ofScheiding: string;
  hoofdnavigatie: string;
  zoek: string;
  mijnLocatie: string;
  verdwenen: string;
  verdwenenStraten: string;
  hulp: string;
  colofon: string;
  kaartlaagKiezen: string;
  kaartlaag: string;
  kaartNu: string;
  kaartNaam: (id: string, standaard: string) => string;
  zoekPlaceholder: string;
  zoekLabel: string;
  toonOpKaart: (naam: string) => string;
  stratenInBuurt: string;
  locatieBepalen: string;
  locatieNietOndersteund: string;
  locatieGeweigerd: string;
  locatieOnbekend: string;
  locatieHttps: string;
  stratenlijstFout: string;
  afstand: (meters: number) => string;
  offlineOpslaan: string;
  offlineTitel: string;
  offlineUitleg: string;
  offlineStart: string;
  offlineBezig: (pct: number) => string;
  offlineKlaar: string;
  offlineFout: string;
};

// Alleen de generieke kaartnamen vertalen; eigennamen (Blaeu, Braun…) blijven.
const KAARTNAMEN: Record<Taal, Record<string, string>> = {
  nl: {},
  en: { pdok: "Current map", braun: "Braun and Hogenberg", kad1613: "Cadastral map", kad1832: "Cadastral map" },
  de: { pdok: "Aktuelle Karte", braun: "Braun und Hogenberg", kad1613: "Katasterkarte", kad1832: "Katasterkarte" },
  fr: { pdok: "Carte actuelle", braun: "Braun et Hogenberg", kad1613: "Carte cadastrale", kad1832: "Carte cadastrale" },
};
const maakKaartNaam =
  (taal: Taal) => (id: string, standaard: string) =>
    KAARTNAMEN[taal][id] ?? standaard;

// Komma-decimaal voor NL/DE/FR, punt-decimaal voor EN.
function afstandKomma(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}
function afstandPunt(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

const TEKSTEN: Record<Taal, Teksten> = {
  nl: {
    welkom: "Welkom bij Straten van Gouda",
    sluiten: "Sluiten",
    introTekst:
      "Ontdek de geschiedenis achter elke Goudse straatnaam. Tik op een straat op de kaart of zoek hieronder.",
    introHint: "Tik op de kaart om rond te kijken.",
    startOpLocatie: "Start op mijn locatie",
    ofScheiding: "of",
    hoofdnavigatie: "Hoofdnavigatie",
    zoek: "Zoek",
    mijnLocatie: "Mijn locatie",
    verdwenen: "Verdwenen",
    verdwenenStraten: "Verdwenen straten",
    hulp: "Hulp",
    colofon: "Colofon",
    kaartlaagKiezen: "Kaartlaag kiezen",
    kaartlaag: "Kaartlaag",
    kaartNu: "nu",
    kaartNaam: maakKaartNaam("nl"),
    zoekPlaceholder: "Zoek een straatnaam…",
    zoekLabel: "Zoek een straatnaam",
    toonOpKaart: (naam) => `${naam} op de kaart tonen`,
    stratenInBuurt: "Straten in mijn buurt",
    locatieBepalen: "Locatie bepalen…",
    locatieNietOndersteund:
      "Locatiebepaling wordt niet ondersteund door deze browser.",
    locatieGeweigerd:
      "Locatietoegang is geweigerd. U kunt ook zoeken op straatnaam.",
    locatieOnbekend: "Uw locatie kon niet bepaald worden.",
    locatieHttps:
      "Locatiebepaling werkt alleen via een beveiligde verbinding (https).",
    stratenlijstFout: "De stratenlijst kon niet geladen worden.",
    afstand: afstandKomma,
    offlineOpslaan: "Alles offline opslaan",
    offlineTitel: "Offline beschikbaar maken",
    offlineUitleg:
      "Sla alle straatpagina's, kaartgegevens en miniaturen op dit apparaat op, zodat de app ook zonder internet werkt. Dit kan enkele honderden MB zijn.",
    offlineStart: "Downloaden",
    offlineBezig: (pct) => `Opslaan… ${pct}%`,
    offlineKlaar: "Klaar! De app werkt nu offline.",
    offlineFout: "Er ging iets mis. Probeer het later opnieuw.",
  },
  en: {
    welkom: "Welcome to Straten van Gouda",
    sluiten: "Close",
    introTekst:
      "Discover the history behind every Gouda street name. Tap a street on the map or search below.",
    introHint: "Tap the map to look around.",
    startOpLocatie: "Start at my location",
    ofScheiding: "or",
    hoofdnavigatie: "Main navigation",
    zoek: "Search",
    mijnLocatie: "My location",
    verdwenen: "Vanished",
    verdwenenStraten: "Vanished streets",
    hulp: "Help",
    colofon: "Colophon",
    kaartlaagKiezen: "Choose map layer",
    kaartlaag: "Map layer",
    kaartNu: "now",
    kaartNaam: maakKaartNaam("en"),
    zoekPlaceholder: "Search for a street name…",
    zoekLabel: "Search for a street name",
    toonOpKaart: (naam) => `Show ${naam} on the map`,
    stratenInBuurt: "Streets near me",
    locatieBepalen: "Determining location…",
    locatieNietOndersteund: "Location is not supported by this browser.",
    locatieGeweigerd:
      "Location access was denied. You can also search by street name.",
    locatieOnbekend: "Your location could not be determined.",
    locatieHttps: "Location only works over a secure connection (https).",
    stratenlijstFout: "The street list could not be loaded.",
    afstand: afstandPunt,
    offlineOpslaan: "Save everything offline",
    offlineTitel: "Make available offline",
    offlineUitleg:
      "Save all street pages, map data and thumbnails on this device so the app works without internet. This can be a few hundred MB.",
    offlineStart: "Download",
    offlineBezig: (pct) => `Saving… ${pct}%`,
    offlineKlaar: "Done! The app now works offline.",
    offlineFout: "Something went wrong. Please try again later.",
  },
  de: {
    welkom: "Willkommen bei Straten van Gouda",
    sluiten: "Schließen",
    introTekst:
      "Entdecken Sie die Geschichte hinter jedem Straßennamen in Gouda. Tippen Sie auf eine Straße auf der Karte oder suchen Sie unten.",
    introHint: "Tippen Sie auf die Karte, um sich umzusehen.",
    startOpLocatie: "An meinem Standort starten",
    ofScheiding: "oder",
    hoofdnavigatie: "Hauptnavigation",
    zoek: "Suchen",
    mijnLocatie: "Mein Standort",
    verdwenen: "Verschwunden",
    verdwenenStraten: "Verschwundene Straßen",
    hulp: "Hilfe",
    colofon: "Impressum",
    kaartlaagKiezen: "Kartenebene wählen",
    kaartlaag: "Kartenebene",
    kaartNu: "jetzt",
    kaartNaam: maakKaartNaam("de"),
    zoekPlaceholder: "Straßennamen suchen…",
    zoekLabel: "Straßennamen suchen",
    toonOpKaart: (naam) => `${naam} auf der Karte zeigen`,
    stratenInBuurt: "Straßen in meiner Nähe",
    locatieBepalen: "Standort wird ermittelt…",
    locatieNietOndersteund:
      "Standortbestimmung wird von diesem Browser nicht unterstützt.",
    locatieGeweigerd:
      "Standortzugriff wurde verweigert. Sie können auch nach Straßennamen suchen.",
    locatieOnbekend: "Ihr Standort konnte nicht ermittelt werden.",
    locatieHttps:
      "Standortbestimmung funktioniert nur über eine sichere Verbindung (https).",
    stratenlijstFout: "Die Straßenliste konnte nicht geladen werden.",
    afstand: afstandKomma,
    offlineOpslaan: "Alles offline speichern",
    offlineTitel: "Offline verfügbar machen",
    offlineUitleg:
      "Speichern Sie alle Straßenseiten, Kartendaten und Miniaturansichten auf diesem Gerät, damit die App auch ohne Internet funktioniert. Das können einige hundert MB sein.",
    offlineStart: "Herunterladen",
    offlineBezig: (pct) => `Speichern… ${pct}%`,
    offlineKlaar: "Fertig! Die App funktioniert jetzt offline.",
    offlineFout: "Etwas ist schiefgelaufen. Bitte später erneut versuchen.",
  },
  fr: {
    welkom: "Bienvenue sur Straten van Gouda",
    sluiten: "Fermer",
    introTekst:
      "Découvrez l'histoire derrière chaque nom de rue de Gouda. Touchez une rue sur la carte ou lancez une recherche ci-dessous.",
    introHint: "Touchez la carte pour explorer.",
    startOpLocatie: "Démarrer à ma position",
    ofScheiding: "ou",
    hoofdnavigatie: "Navigation principale",
    zoek: "Rechercher",
    mijnLocatie: "Ma position",
    verdwenen: "Disparues",
    verdwenenStraten: "Rues disparues",
    hulp: "Aide",
    colofon: "Crédits",
    kaartlaagKiezen: "Choisir le fond de carte",
    kaartlaag: "Fond de carte",
    kaartNu: "actuel",
    kaartNaam: maakKaartNaam("fr"),
    zoekPlaceholder: "Rechercher un nom de rue…",
    zoekLabel: "Rechercher un nom de rue",
    toonOpKaart: (naam) => `Afficher ${naam} sur la carte`,
    stratenInBuurt: "Rues à proximité",
    locatieBepalen: "Localisation en cours…",
    locatieNietOndersteund:
      "La géolocalisation n'est pas prise en charge par ce navigateur.",
    locatieGeweigerd:
      "L'accès à la localisation a été refusé. Vous pouvez aussi rechercher par nom de rue.",
    locatieOnbekend: "Votre position n'a pas pu être déterminée.",
    locatieHttps:
      "La localisation ne fonctionne que via une connexion sécurisée (https).",
    stratenlijstFout: "La liste des rues n'a pas pu être chargée.",
    afstand: afstandKomma,
    offlineOpslaan: "Tout enregistrer hors ligne",
    offlineTitel: "Rendre disponible hors ligne",
    offlineUitleg:
      "Enregistrez toutes les pages de rues, les données cartographiques et les miniatures sur cet appareil pour que l'application fonctionne sans connexion. Cela peut représenter quelques centaines de Mo.",
    offlineStart: "Télécharger",
    offlineBezig: (pct) => `Enregistrement… ${pct}%`,
    offlineKlaar: "Terminé ! L'application fonctionne désormais hors ligne.",
    offlineFout: "Une erreur s'est produite. Réessayez plus tard.",
  },
};

type TaalContextType = { taal: Taal; setTaal: (t: Taal) => void; t: Teksten };
const TaalContext = createContext<TaalContextType | null>(null);

export function TaalProvider({ children }: { children: ReactNode }) {
  const [taal, setTaalState] = useState<Taal>("nl");

  // Voorkeur uit een eerdere sessie herstellen (na hydratie, geen SSR-mismatch).
  useEffect(() => {
    const opgeslagen = localStorage.getItem("taal");
    if (opgeslagen === "en" || opgeslagen === "nl") setTaalState(opgeslagen);
  }, []);

  useEffect(() => {
    document.documentElement.lang = taal;
  }, [taal]);

  const setTaal = (nieuw: Taal) => {
    setTaalState(nieuw);
    try {
      localStorage.setItem("taal", nieuw);
    } catch {
      /* localStorage kan geblokkeerd zijn; taal blijft dan sessiegebonden */
    }
  };

  return (
    <TaalContext.Provider value={{ taal, setTaal, t: TEKSTEN[taal] }}>
      {children}
    </TaalContext.Provider>
  );
}

export function useTaal(): TaalContextType {
  const ctx = useContext(TaalContext);
  if (!ctx) throw new Error("useTaal moet binnen <TaalProvider> gebruikt worden");
  return ctx;
}
