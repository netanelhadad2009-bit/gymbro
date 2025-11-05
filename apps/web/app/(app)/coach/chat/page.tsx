import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/supabase-server";
import { getActiveAssignment, getCoachProfile } from "@/lib/coach/queries";
import { ChatScreen } from "@/components/coach/chat/ChatScreen";

export const dynamic = "force-dynamic";

export default async function CoachChatPage() {
  const { data: { session } } = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  const assignment = await getActiveAssignment(session.user.id);

  if (!assignment) {
    redirect("/coach");
  }

  const coachProfile = await getCoachProfile(assignment.id);

  if (!coachProfile) {
    redirect("/coach");
  }

  return (
    <ChatScreen
      coachName={coachProfile.coach.full_name}
      coachAvatar={coachProfile.coach.avatar_url}
    />
  );
}
