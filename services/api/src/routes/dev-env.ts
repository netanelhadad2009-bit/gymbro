import { Router } from "express";

export const devEnvRouter = Router();

devEnvRouter.get("/env", (_req, res) => {
  const mask = (v?: string | null) => (v ? `${v.slice(0,6)}...len=${v.length}` : "MISSING");
  res.json({
    ok: true,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: mask(process.env.SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NODE_ENV: process.env.NODE_ENV || null,
  });
});
