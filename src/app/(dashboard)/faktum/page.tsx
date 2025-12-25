import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FaktumForm } from "@/components/case/FaktumForm";
import { getSubscriptionStatus } from "@/lib/subscription";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";

export const metadata = {
  title: "Ny sak | Lovsentralen",
  description: "Beskriv din juridiske situasjon for å få veiledning",
};

export default async function FaktumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const subscription = await getSubscriptionStatus(user.id);

  return (
    <SubscriptionGate isSubscribed={subscription.isActive}>
      <FaktumForm />
    </SubscriptionGate>
  );
}
