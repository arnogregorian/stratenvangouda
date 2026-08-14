import Kaart from "@/components/Kaart";
import Zoekveld from "@/components/Zoekveld";
import GpsKnop from "@/components/GpsKnop";
import stijl from "./home.module.css";

export default function Homepage() {
  return (
    <main id="inhoud" className={stijl.scherm}>
      <Kaart />
      <header className={stijl.paneel}>
        <h1 className={stijl.titel}>Straten van Gouda</h1>
        <p className={stijl.ondertitel}>
          Ontdek de geschiedenis achter elke Goudse straatnaam. Tik op een
          straat op de kaart of zoek hieronder.
        </p>
        <Zoekveld />
        <nav aria-label="Over deze website" className={stijl.subnav}>
          <a href="/hulp/">Hulp</a>
          <span aria-hidden="true">·</span>
          <a href="/colofon/">Colofon</a>
        </nav>
      </header>
      <div className={stijl.gps}>
        <GpsKnop />
      </div>
    </main>
  );
}
