import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    // Get the user's Stripe customer ID
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Ingen aktiv abonnement funnet" },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${baseUrl}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Kunne ikke åpne administrasjonspanel" },
      { status: 500 }
    );
  }
}

