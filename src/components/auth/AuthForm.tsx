"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardContent, CardHeader } from "@/components/ui";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        setMagicLinkSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/faktum");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "En feil oppsto. Prøv igjen.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Skriv inn e-postadressen din først");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunne ikke sende magisk lenke.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <Card variant="elevated" className="max-w-md mx-auto">
        <CardContent className="text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Sjekk e-posten din
          </h2>
          <p className="text-slate-600">
            Vi har sendt{" "}
            {mode === "register"
              ? "en bekreftelseslenke"
              : "en innloggingslenke"}{" "}
            til <strong>{email}</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="max-w-md mx-auto">
      <CardHeader>
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === "login" ? "Logg inn" : "Opprett konto"}
        </h1>
        <p className="text-slate-600 mt-1">
          {mode === "login"
            ? "Velkommen tilbake til Lovsentralen"
            : "Få juridisk veiledning tilpasset din situasjon"}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Input
            type="email"
            label="E-post"
            placeholder="din@epost.no"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            type="password"
            label="Passord"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={loading}
          >
            {mode === "login" ? "Logg inn" : "Opprett konto"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-slate-500">eller</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleMagicLink}
            disabled={loading}
          >
            Send magisk lenke til e-post
          </Button>

          <p className="text-center text-sm text-slate-600">
            {mode === "login" ? (
              <>
                Har du ikke konto?{" "}
                <Link
                  href="/register"
                  className="text-amber-600 hover:text-amber-700 font-medium"
                >
                  Opprett konto
                </Link>
              </>
            ) : (
              <>
                Har du allerede konto?{" "}
                <Link
                  href="/login"
                  className="text-amber-600 hover:text-amber-700 font-medium"
                >
                  Logg inn
                </Link>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
