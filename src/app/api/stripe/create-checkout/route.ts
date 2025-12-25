import { createClient } from "@/lib/supabase/server";
import { getStripe, SUBSCRIPTION_PRICE_ID } from "@/lib/stripe";
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

    if (!SUBSCRIPTION_PRICE_ID) {
      console.error("STRIPE_PRICE_ID is not set");
      return NextResponse.json(
        { error: "Betalingssystem ikke konfigurert" },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create a new Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: "inactive",
      });
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
      // Norwegian locale and currency
      locale: "nb",
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Kunne ikke opprette betalingsøkt" },
      { status: 500 }
    );
  }
}

