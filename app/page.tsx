import StartScherm from "@/components/StartScherm";
import { TaalProvider } from "@/lib/taal";

export default function Homepage() {
  return (
    <TaalProvider>
      <StartScherm />
    </TaalProvider>
  );
}
