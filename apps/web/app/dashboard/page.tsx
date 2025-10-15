import { redirect } from "next/navigation";
import { getServerSession, createServerSupabaseClient } from "../../lib/supabase-server";

export default async function DashboardPage() {
  const { data: { session } } = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>ברוכים הבאים</h1>
      <p>משתמש: {session.user.email}</p>

      <form
        action={async () => {
          'use server';
          const supabase = await createServerSupabaseClient();
          await supabase.auth.signOut();
          redirect("/login");
        }}
      >
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
        >
          התנתק
        </button>
      </form>
    </div>
  );
}