import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui";
import Link from "next/link";

export const metadata = {
  title: "Velkommen til Pro! | Lovsentralen",
  description: "Ditt abonnement er nå aktivt",
};

export default async function SubscriptionSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      <Card variant="elevated">
        <CardContent className="py-12">
          {/* Success animation */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-600"
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
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Velkommen til Lovsentralen Pro! 🎉
          </h1>
          
          <p className="text-lg text-slate-600 mb-8">
            Ditt abonnement er nå aktivt. Du har nå ubegrenset tilgang til
            juridiske analyser.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-amber-900 mb-2">
              Hva du nå kan gjøre:
            </h3>
            <ul className="text-amber-800 text-sm space-y-1">
              <li>✓ Opprett ubegrenset antall saker</li>
              <li>✓ Få detaljerte juridiske analyser</li>
              <li>✓ Eksporter til PDF</li>
              <li>✓ Tilgang til alle rettskilder</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/faktum"
              className="block w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold"
            >
              Opprett din første sak →
            </Link>
            <Link
              href="/profile"
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Administrer abonnement
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

