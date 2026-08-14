import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

/**
 * Statische teksten (Colofon, Hulp) staan als Markdown in content/ en zijn
 * daarmee door redactionele medewerkers van Die Goude te onderhouden zonder
 * ontwikkelaar (RFP §6.5). Rendering gebeurt tijdens de build.
 */
export function renderContent(bestand: string): string {
  const pad = join(process.cwd(), "content", bestand);
  return marked.parse(readFileSync(pad, "utf8"), { async: false });
}
