import { createClient } from "@/lib/supabase/server";

export interface SubscriptionStatus {
  isActive: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = await createClient();
  
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .single();

  if (!subscription) {
    return {
      isActive: false,
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  // Check if subscription is active or trialing
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  return {
    isActive,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
  };
}

export async function requireSubscription(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(userId);
  return status.isActive;
}

