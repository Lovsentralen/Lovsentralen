import Stripe from "stripe";

// Lazy-loaded Stripe client
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeClient;
}

// Price ID for the 199 NOK/month subscription
// You'll need to create this in Stripe Dashboard and update this value
export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID || "";

// Product details
export const SUBSCRIPTION_DETAILS = {
  name: "Lovsentralen Pro",
  price: 199,
  currency: "NOK",
  interval: "month" as const,
  features: [
    "Ubegrenset tilgang til juridiske analyser",
    "Søk i alle norske rettskilder",
    "Personlig tilpassede anbefalinger",
    "Eksporter til PDF",
    "Prioritert støtte",
  ],
};

