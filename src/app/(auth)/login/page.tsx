import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Logg inn | Lovsentralen",
  description: "Logg inn på Lovsentralen for juridisk veiledning",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Lov<span className="text-amber-600">sentralen</span>
          </h1>
          <p className="text-slate-600 mt-2">Din digitale juridiske veileder</p>
        </div>
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
