"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui";

export function FaktumForm() {
  const router = useRouter();
  const [faktum, setFaktum] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (faktum.trim().length < 50) {
      setError(
        "Vennligst beskriv situasjonen din mer detaljert (minst 50 tegn).",
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faktum_text: faktum.trim(),
          category: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kunne ikke opprette sak");
      }

      const { data } = await response.json();
      router.push(`/clarifications/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "En feil oppsto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <h1 className="text-2xl font-bold text-slate-900">
          Beskriv din situasjon
        </h1>
        <p className="text-slate-600 mt-1">
          Forklar hva som har skjedd, så hjelper vi deg med å forstå dine
          rettigheter.
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-medium text-amber-900 mb-2">
              💡 Tips for god beskrivelse
            </h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Når skjedde det? (datoer og tidslinjer)</li>
              <li>
                • Hvem er involvert? (butikk, utleier, arbeidsgiver, etc.)
              </li>
              <li>• Hva er problemet? (hva er galt eller urettferdig)</li>
              <li>
                • Hva ønsker du å oppnå? (pengene tilbake, heving, erstatning)
              </li>
            </ul>
          </div>

          <Textarea
            label="Faktum – Hva har skjedd?"
            placeholder="Beskriv situasjonen din så detaljert som mulig. For eksempel: 'Jeg kjøpte en brukt bil fra en forhandler i Oslo den 15. oktober. Etter 2 uker oppdaget jeg at motoren har en alvorlig feil som selgeren ikke opplyste om...'"
            value={faktum}
            onChange={(e) => setFaktum(e.target.value)}
            className="min-h-[200px]"
            required
          />

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 mb-2">
              ⚠️ Viktig informasjon
            </h3>
            <p className="text-sm text-slate-600">
              Lovsentralen gir generell juridisk informasjon basert på
              offentlige kilder. Dette er <strong>ikke</strong> juridisk
              rådgivning og erstatter ikke konsultasjon med advokat. For
              alvorlige saker anbefaler vi at du kontakter en advokat.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button type="submit" size="lg" isLoading={loading}>
            Fortsett til spørsmål
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
