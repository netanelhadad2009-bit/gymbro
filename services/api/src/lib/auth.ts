import type { Request, Response, NextFunction } from "express";
import { supabaseAnon } from "./supabase";

export type AuthedRequest = Request & { user?: { id: string; email?: string | null } };

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ ok: false, error: "missing_token" });

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ ok: false, error: "invalid_token" });

  req.user = { id: data.user.id, email: data.user.email ?? null };
  next();
}
