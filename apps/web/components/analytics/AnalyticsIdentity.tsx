"use client";

import { useEffect } from "react";
import { identify, setUserProps } from "@/lib/mixpanel";
import { useAuth } from "@/contexts/AuthProvider";

export function AnalyticsIdentity() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    identify(user.id);

    setUserProps({
      email: user.email ?? undefined,
      signup_date: user.created_at ?? undefined,
    });
  }, [user?.id, user?.email, user?.created_at]);

  return null;
}
