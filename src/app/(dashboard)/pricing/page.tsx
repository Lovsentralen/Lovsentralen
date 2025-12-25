import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_DETAILS } from "@/lib/stripe";
import { SubscribeButton } from "@/components/subscription/SubscribeButton";
import { Card, CardContent, CardHeader } from "@/components/ui";
import Link from "next/link";

export const metadata = {
  title: "Priser | Lovsentralen",
  description: "Få ubegrenset tilgang til juridisk analyse med Lovsentralen Pro",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user already has an active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .single();

  const isSubscribed = subscription?.status === "active";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Få ubegrenset tilgang
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Med Lovsentralen Pro får du ubegrenset tilgang til juridiske analyser
          basert på oppdaterte norske rettskilder.
        </p>
      </div>

      {/* Pricing Card */}
      <div className="max-w-md mx-auto">
        <Card variant="elevated" className="border-2 border-amber-500 relative overflow-hidden">
          {/* Popular badge */}
          <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
            Mest populær
          </div>

          <CardHeader className="text-center pt-8 pb-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {SUBSCRIPTION_DETAILS.name}
            </h2>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-slate-900">
                {SUBSCRIPTION_DETAILS.price}
              </span>
              <span className="text-xl text-slate-600">
                {SUBSCRIPTION_DETAILS.currency}/{SUBSCRIPTION_DETAILS.interval === "month" ? "mnd" : "år"}
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Features list */}
            <ul className="space-y-4 mb-8">
              {SUBSCRIPTION_DETAILS.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Subscribe button */}
            {isSubscribed ? (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-medium">
                    ✓ Du har allerede et aktivt abonnement
                  </p>
                  {subscription.current_period_end && (
                    <p className="text-sm text-green-600 mt-1">
                      Fornyes{" "}
                      {new Date(subscription.current_period_end).toLocaleDateString("nb-NO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <Link
                  href="/profile"
                  className="text-amber-600 hover:text-amber-700 font-medium"
                >
                  Administrer abonnement →
                </Link>
              </div>
            ) : (
              <SubscribeButton />
            )}

            {/* Money back guarantee */}
            <p className="text-center text-sm text-slate-500 mt-6">
              🔒 Sikker betaling via Stripe. Avbryt når som helst.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FAQ or additional info */}
      <div className="mt-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Ofte stilte spørsmål
        </h3>
        <div className="max-w-2xl mx-auto space-y-4 text-left">
          <details className="bg-white rounded-lg border border-slate-200 p-4">
            <summary className="font-medium text-slate-900 cursor-pointer">
              Kan jeg avbryte når som helst?
            </summary>
            <p className="mt-2 text-slate-600">
              Ja, du kan avbryte abonnementet når som helst. Du beholder tilgang
              ut den betalte perioden.
            </p>
          </details>
          <details className="bg-white rounded-lg border border-slate-200 p-4">
            <summary className="font-medium text-slate-900 cursor-pointer">
              Hva skjer med mine saker hvis jeg avbryter?
            </summary>
            <p className="mt-2 text-slate-600">
              Alle dine tidligere analyser og saker vil fortsatt være tilgjengelige
              for lesing, men du kan ikke opprette nye analyser uten abonnement.
            </p>
          </details>
          <details className="bg-white rounded-lg border border-slate-200 p-4">
            <summary className="font-medium text-slate-900 cursor-pointer">
              Hvilke betalingsmetoder aksepterer dere?
            </summary>
            <p className="mt-2 text-slate-600">
              Vi aksepterer alle vanlige betalingskort (Visa, Mastercard, American Express)
              via Stripe.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}

