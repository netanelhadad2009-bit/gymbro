import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type BootstrapAuth = {
  authenticated: boolean;
  userId: string | null;
  onboardingDone: boolean;
};

export async function getBootstrapAuth(): Promise<BootstrapAuth> {
  const store = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (k) => store.get(k)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { authenticated: false, userId: null, onboardingDone: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_completed_onboarding")
    .eq("id", session.user.id)
    .maybeSingle();

  return {
    authenticated: true,
    userId: session.user.id,
    onboardingDone: !!profile?.has_completed_onboarding,
  };
}
