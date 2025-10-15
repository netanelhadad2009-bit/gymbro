"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      router.push("/");
    };
    logout();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0e0f12] flex items-center justify-center text-white">
      <p>מתנתק...</p>
    </div>
  );
}
