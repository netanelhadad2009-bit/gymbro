import { Router } from "express";
import { requireAuth, AuthedRequest } from "../lib/auth";

export const authRouter = Router();

// Simple probe: returns the authed user (requires valid JWT in Authorization header)
authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  res.json({ ok: true, user: req.user });
});
