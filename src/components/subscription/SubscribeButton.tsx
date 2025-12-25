"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function SubscribeButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke starte betaling");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleSubscribe}
        isLoading={isLoading}
        size="lg"
        className="w-full text-lg py-4"
      >
        {isLoading ? "Åpner betaling..." : "Start abonnement"}
      </Button>
      {error && (
        <p className="text-red-600 text-sm text-center mt-2">{error}</p>
      )}
    </div>
  );
}

