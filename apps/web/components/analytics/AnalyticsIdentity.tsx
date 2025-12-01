"use client";

import { useEffect } from "react";
import { identify, setUserProps } from "@/lib/mixpanel";
import AppsFlyer from "@/lib/appsflyer";
import { useAuth } from "@/contexts/AuthProvider";

export function AnalyticsIdentity() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // [analytics] Identify user in Mixpanel
    identify(user.id);

    setUserProps({
      email: user.email ?? undefined,
      signup_date: user.created_at ?? undefined,
    });

    // [analytics] Set customer ID in AppsFlyer (native only)
    AppsFlyer.setCustomerUserId(user.id);
  }, [user?.id, user?.email, user?.created_at]);

  return null;
}
