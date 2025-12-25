import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ManageSubscription } from "@/components/subscription/ManageSubscription";
import { getSubscriptionStatus } from "@/lib/subscription";

export const metadata = {
  title: "Min profil | Lovsentralen",
  description: "Administrer din profil og kontoinnstillinger",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const subscription = await getSubscriptionStatus(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Min profil</h1>
        <p className="text-slate-600 mt-1">
          Administrer din konto og innstillinger
        </p>
      </div>

      {/* Subscription Management */}
      <ManageSubscription
        status={subscription.status}
        currentPeriodEnd={subscription.currentPeriodEnd}
        cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
      />

      {/* Account Info */}
      <Card variant="bordered">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Kontoinformasjon</h2>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Bruker-ID</dt>
              <dd className="mt-1 text-sm text-slate-900 font-mono bg-slate-50 px-3 py-2 rounded-lg">
                {user.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Nåværende e-post</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Konto opprettet</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {new Date(user.created_at).toLocaleDateString("nb-NO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Email Update Form */}
      <ProfileForm currentEmail={user.email || ""} />

      {/* Danger Zone */}
      <Card variant="bordered" className="border-red-200">
        <CardHeader>
          <h2 className="text-lg font-semibold text-red-700">Faresone</h2>
          <p className="text-sm text-slate-600 mt-1">
            Irreversible handlinger for kontoen din
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Hvis du ønsker å slette kontoen din, kontakt oss på support@lovsentralen.no
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

