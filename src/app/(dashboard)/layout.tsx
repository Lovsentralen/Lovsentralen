import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/faktum"
              className="text-xl font-bold text-slate-900 tracking-tight"
            >
              Lov<span className="text-amber-600">sentralen</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/faktum"
                className="text-slate-600 hover:text-amber-600 transition-colors font-medium"
              >
                Ny sak
              </Link>
              <Link
                href="/history"
                className="text-slate-600 hover:text-amber-600 transition-colors font-medium"
              >
                Mine saker
              </Link>
              <Link
                href="/pricing"
                className="text-slate-600 hover:text-amber-600 transition-colors font-medium"
              >
                Priser
              </Link>
              <Link
                href="/profile"
                className="text-slate-600 hover:text-amber-600 transition-colors font-medium"
              >
                Min profil
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-slate-500 hover:text-slate-700 transition-colors text-sm"
                >
                  Logg ut
                </button>
              </form>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            ⚠️ Lovsentralen gir kun generell juridisk informasjon, ikke juridisk
            rådgivning. For konkrete saker, kontakt en advokat.
          </p>
        </div>
      </footer>
    </div>
  );
}
