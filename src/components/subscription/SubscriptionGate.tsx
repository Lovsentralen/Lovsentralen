"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { SUBSCRIPTION_DETAILS } from "@/lib/stripe";

interface SubscriptionGateProps {
  children: React.ReactNode;
  isSubscribed: boolean;
  fallback?: React.ReactNode;
}

export function SubscriptionGate({ 
  children, 
  isSubscribed, 
  fallback 
}: SubscriptionGateProps) {
  if (isSubscribed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card variant="elevated">
        <CardContent className="py-10 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Abonnement påkrevd
          </h2>
          
          <p className="text-slate-600 mb-6">
            For å opprette nye saker og få juridiske analyser trenger du et
            aktivt abonnement.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-lg font-semibold text-slate-900">
              {SUBSCRIPTION_DETAILS.name}
            </p>
            <p className="text-2xl font-bold text-amber-600">
              {SUBSCRIPTION_DETAILS.price} {SUBSCRIPTION_DETAILS.currency}/mnd
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-block w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold"
          >
            Se priser og abonner →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

