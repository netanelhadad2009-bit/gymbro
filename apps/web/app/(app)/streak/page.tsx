/**
 * /streak - Day Streak Page
 *
 * Server component that fetches initial streak data and renders client component.
 */

import { createClient } from "@/lib/supabase/server";
import { getStreakSummary } from "@/lib/streak";
import { redirect } from "next/navigation";
import DayStreakPage from "@/components/streak/DayStreakPage";

export const metadata = {
  title: "רצף ימים | FitJourney",
  description: "עקוב אחר הרצף היומי שלך",
};

export default async function StreakPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch initial streak data (server-side)
  let initialData: Awaited<ReturnType<typeof getStreakSummary>> | undefined = undefined;
  try {
    initialData = await getStreakSummary(user.id);
  } catch (error) {
    console.error("[StreakPage] Error fetching initial data:", error);
    // Client will handle fetching if initialData is undefined
  }

  return <DayStreakPage initialData={initialData} />;
}
