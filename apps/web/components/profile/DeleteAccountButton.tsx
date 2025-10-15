"use client";

import { useRouter } from "next/navigation";
import { nativeConfirm } from "@/lib/nativeConfirm";
import { supabase } from "@/lib/supabase";
import { Trash2 } from "lucide-react";
import texts from "@/lib/assistantTexts";

export default function DeleteAccountButton() {
  const router = useRouter();

  const handleDelete = async () => {
    const ok = await nativeConfirm(
      "מחיקת חשבון",
      "האם אתה בטוח שברצונך למחוק את החשבון לצמיתות?\nהפעולה בלתי הפיכה.",
      "מחק חשבון",
      "ביטול"
    );

    if (!ok) return;

    try {
      // Call server route to delete account
      const res = await fetch("/api/account/delete", { method: "DELETE" });

      if (!res.ok) {
        console.error("Delete account failed", await res.text());
        return;
      }

      // Sign out locally and redirect
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      console.error("Error during account deletion:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="flex w-full items-center justify-between py-3 border-b border-[#2A2B2C] active:bg-[#222529] active:opacity-90 transition-opacity text-right"
    >
      <div className="flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-white" />
        <span className="text-white font-medium">{texts.profile.deleteAccount}</span>
      </div>
    </button>
  );
}
