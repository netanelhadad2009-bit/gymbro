"use client";
import { useState, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password/confirm",
    });

    if (error) {
      setMessage("שגיאה: " + error.message);
    } else {
      setMessage("נשלח לך אימייל עם הוראות לאיפוס הסיסמה");
    }

    setLoading(false);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white">
      <div className="mx-auto max-w-md px-5 pt-10 pb-20 flex flex-col gap-8">
        {/* Brand Title */}
        <h1 className="text-[#e2f163] text-4xl font-bold text-center">GYMBRO</h1>

        {/* Reset Password Form */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm text-right">אימייל</label>
            <input
              id="email"
              type="email"
              className="h-12 rounded-xl bg-black/30 text-white px-4 outline-none ring-1 ring-white/10 focus:ring-[#e2f163]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              required
            />
          </div>

          {message && (
            <div className={`text-sm text-center p-3 rounded-lg ${
              message.includes("שגיאה") 
                ? "text-red-400 bg-red-500/10" 
                : "text-[#e2f163] bg-[#e2f163]/10"
            }`}>
              {message}
            </div>
          )}

          <button 
            type="submit" 
            className="mt-2 h-12 rounded-full bg-[#e2f163] text-black font-bold hover:bg-[#e2f163]/90 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "שולח..." : "שלח קישור לאיפוס"}
          </button>
        </form>

        {/* Bottom links */}
        <p className="text-center text-sm text-white/70">
          <Link href="/login" className="text-[#e2f163] underline-offset-2 hover:underline">
            חזור להתחברות
          </Link>
        </p>
      </div>
    </main>
  );
}




