import NavFooter from "@/components/NavFooter";

export default function NietGevonden() {
  return (
    <>
      <main id="inhoud" className="pagina">
        <h1>Pagina niet gevonden</h1>
        <p>
          Deze straat of pagina bestaat niet (meer). Ga terug naar{" "}
          <a href="/">de kaart</a> en zoek de straat op naam.
        </p>
      </main>
      <NavFooter />
    </>
  );
}
