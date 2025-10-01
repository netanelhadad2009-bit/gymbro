import { Router } from "express";
import { supabaseService } from "../lib/supabase";

export const devAdminRouter = Router();

devAdminRouter.get("/admin-ping", async (_req, res) => {
  try {
    const result = await supabaseService.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (result.error) {
      return res.status(500).json({ ok: false, error: result.error.message });
    }
    return res.json({ ok: true, count: result.data.users.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "unknown_error" });
  }
});
