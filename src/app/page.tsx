import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#grid)"
              className="text-amber-500"
            />
          </svg>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">
              Lov<span className="text-amber-400">sentralen</span>
            </span>
            <div className="flex items-center gap-4">
              {user ? (
                <Link
                  href="/faktum"
                  className="px-5 py-2.5 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors font-semibold"
                >
                  Gå til appen →
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-slate-300 hover:text-white transition-colors font-medium"
                  >
                    Logg inn
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2.5 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors font-semibold"
                  >
                    Kom i gang
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Gratis juridisk veiledning for alle
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Forstå dine <span className="text-amber-400">rettigheter</span>
          </h1>

          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Beskriv din situasjon, og få skreddersydd juridisk veiledning basert
            på norske lover og forskrifter. Gratis og tilgjengelig for alle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={user ? "/faktum" : "/register"}
              className="w-full sm:w-auto px-8 py-4 bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 transition-all font-bold text-lg shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40"
            >
              Start din analyse →
            </Link>
            <Link
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 border-2 border-slate-600 text-slate-300 rounded-xl hover:border-slate-500 hover:text-white transition-all font-medium"
            >
              Hvordan fungerer det?
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="how-it-works" className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Hvordan Lovsentralen fungerer
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Tre enkle steg til juridisk klarhet
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-amber-200 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                1. Beskriv situasjonen
              </h3>
              <p className="text-slate-600">
                Forklar hva som har skjedd med egne ord. Ingen juridisk kunnskap
                nødvendig.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-amber-200 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                2. Vi søker i lovverket
              </h3>
              <p className="text-slate-600">
                Vi søker gjennom Lovdata, offentlige kilder og forskrifter for å
                finne relevant informasjon.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-amber-200 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                3. Få svar med kilder
              </h3>
              <p className="text-slate-600">
                Motta konkrete svar på spørsmål du sannsynligvis lurer på, med
                direkte lenker til kildene.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Vi hjelper deg med
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                emoji: "🛒",
                title: "Forbrukerkjøp",
                desc: "Reklamasjon, heving, garanti",
              },
              {
                emoji: "🏠",
                title: "Husleie",
                desc: "Leiekontrakter, oppsigelse, deposita",
              },
              {
                emoji: "💼",
                title: "Arbeidsrett",
                desc: "Oppsigelse, permisjon, rettigheter",
              },
              {
                emoji: "🔒",
                title: "Personvern",
                desc: "GDPR, innsyn, sletting",
              },
              {
                emoji: "📄",
                title: "Kontrakter",
                desc: "Avtalebrudd, erstatning",
              },
              {
                emoji: "⚖️",
                title: "Erstatning",
                desc: "Skadeserstatning, krav",
              },
            ].map((category) => (
              <div
                key={category.title}
                className="p-6 bg-white rounded-xl border-2 border-slate-100 hover:border-amber-300 hover:shadow-lg transition-all"
              >
                <span className="text-3xl mb-3 block">{category.emoji}</span>
                <h3 className="font-semibold text-slate-900 mb-1">
                  {category.title}
                </h3>
                <p className="text-sm text-slate-600">{category.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer Section */}
      <div className="bg-amber-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl font-semibold text-amber-900 mb-4">
            ⚠️ Viktig informasjon
          </h3>
          <p className="text-amber-800 leading-relaxed">
            Lovsentralen gir generell juridisk informasjon basert på offentlige
            kilder. Dette er <strong>ikke juridisk rådgivning</strong> og
            erstatter ikke konsultasjon med en kvalifisert advokat. For
            alvorlige saker anbefaler vi alltid profesjonell hjelp.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Klar til å forstå dine rettigheter?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Opprett en gratis konto og få juridisk veiledning tilpasset din
            situasjon.
          </p>
          <Link
            href={user ? "/faktum" : "/register"}
            className="inline-flex px-8 py-4 bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 transition-all font-bold text-lg"
          >
            Kom i gang gratis →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xl font-bold text-white">
              Lov<span className="text-amber-400">sentralen</span>
            </span>
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Lovsentralen. Juridisk informasjon,
              ikke rådgivning.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
