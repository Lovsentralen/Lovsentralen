"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button, Card, CardContent, CardHeader } from "@/components/ui";

interface ProfileFormProps {
  currentEmail: string;
}

export function ProfileForm({ currentEmail }: ProfileFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(currentEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email === currentEmail) {
      setMessage({ type: "error", text: "E-posten er den samme som før" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Kunne ikke oppdatere e-post" });
        return;
      }

      setMessage({ 
        type: "success", 
        text: "En bekreftelseslenke er sendt til din nye e-postadresse. Sjekk innboksen din." 
      });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Noe gikk galt. Prøv igjen." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="bordered">
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-900">E-postadresse</h2>
        <p className="text-sm text-slate-600 mt-1">
          Oppdater din e-postadresse for innlogging
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Ny e-postadresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@epost.no"
            required
          />
          
          {message && (
            <div
              className={`p-4 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || email === currentEmail}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Oppdaterer..." : "Oppdater e-post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

