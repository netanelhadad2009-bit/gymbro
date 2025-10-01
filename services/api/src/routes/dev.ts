import { Router } from "express";
import { supabaseAnon, supabaseService } from "../lib/supabase";

export const devRouter = Router();

// Dev-only: create (if needed) and sign-in a test user, return JWT
devRouter.post("/login", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ ok: false, error: "disabled_in_production" });
  }

  const email = (req.body?.email as string) || "dev+test@example.com";
  const password = (req.body?.password as string) || "DevTest123!";

  // Ensure user exists (admin — service role)
  const list = await supabaseService.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) return res.status(500).json({ ok: false, error: "list_users_failed", details: list.error.message });

  const exists = list.data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!exists) {
    const created = await supabaseService.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (created.error) return res.status(500).json({ ok: false, error: "create_user_failed", details: created.error.message });
  }

  // Sign-in to get a session (anon client)
  const signed = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data?.session) {
    return res.status(500).json({ ok: false, error: "signin_failed", details: signed.error?.message });
  }

  return res.json({
    ok: true,
    email,
    access_token: signed.data.session.access_token,
    user_id: signed.data.user.id
  });
});
