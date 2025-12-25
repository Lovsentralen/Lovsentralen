"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";

interface ManageSubscriptionProps {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function ManageSubscription({
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: ManageSubscriptionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = status === "active" || status === "trialing";

  const handleManageSubscription = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke åpne administrasjonspanel");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setIsLoading(false);
    }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: "Aktivt", color: "bg-green-100 text-green-800" },
    trialing: { label: "Prøveperiode", color: "bg-blue-100 text-blue-800" },
    past_due: { label: "Forfalt", color: "bg-red-100 text-red-800" },
    canceled: { label: "Avbrutt", color: "bg-slate-100 text-slate-800" },
    inactive: { label: "Inaktivt", color: "bg-slate-100 text-slate-800" },
  };

  const currentStatus = statusLabels[status || "inactive"] || statusLabels.inactive;

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Abonnement</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentStatus.color}`}>
            {currentStatus.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isActive ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Lovsentralen Pro</p>
              <p className="text-lg font-semibold text-slate-900">199 NOK/måned</p>
            </div>

            {currentPeriodEnd && (
              <div>
                <p className="text-sm text-slate-600">
                  {cancelAtPeriodEnd ? "Utløper" : "Fornyes"}
                </p>
                <p className="text-slate-900">
                  {new Date(currentPeriodEnd).toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}

            {cancelAtPeriodEnd && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ Abonnementet ditt vil ikke fornyes. Du beholder tilgang til{" "}
                  {currentPeriodEnd
                    ? new Date(currentPeriodEnd).toLocaleDateString("nb-NO")
                    : "slutten av perioden"}
                  .
                </p>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleManageSubscription}
              isLoading={isLoading}
              className="w-full"
            >
              {isLoading ? "Åpner..." : "Administrer abonnement"}
            </Button>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-600">
              Du har ikke et aktivt abonnement. Få ubegrenset tilgang til
              juridiske analyser med Lovsentralen Pro.
            </p>
            <a
              href="/pricing"
              className="block w-full px-4 py-2 bg-amber-600 text-white text-center rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Se priser →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

