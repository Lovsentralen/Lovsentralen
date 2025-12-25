import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Use service role for webhook to bypass RLS
function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const item = subscription.items.data[0];

          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            status: subscription.status,
            price_id: item?.price.id,
            current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
            current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const item = subscription.items.data[0];

        if (userId) {
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              price_id: item?.price.id,
              current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
              current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              stripe_subscription_id: null,
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionDetails = invoice.parent?.subscription_details;
        const subscriptionId = typeof subscriptionDetails?.subscription === 'string' 
          ? subscriptionDetails.subscription 
          : subscriptionDetails?.subscription?.id;

        if (subscriptionId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionDetails = invoice.parent?.subscription_details;
        const subscriptionId = typeof subscriptionDetails?.subscription === 'string' 
          ? subscriptionDetails.subscription 
          : subscriptionDetails?.subscription?.id;

        if (subscriptionId) {
          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const item = subscription.items.data[0];

          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
              current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

