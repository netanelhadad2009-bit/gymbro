import { Router } from "express";
import { prisma } from "@fitjourney/db";
import { requireAuth, AuthedRequest } from "../lib/auth";

export const userRouter = Router();

/**
 * Upsert current authed user into public."User"
 * Requires Bearer JWT. Uses id/email from the token.
 */
userRouter.post("/sync", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const authUserId = req.user!.id;
    const email = req.user!.email ?? null;

    const user = await prisma.user.upsert({
      where: { authUserId },
      update: { email },
      create: { authUserId, email },
      select: { id: true, authUserId: true, email: true, createdAt: true }
    });

    return res.json({ ok: true, user });
  } catch (err: any) {
    console.error("user/sync error:", err);
    return res.status(500).json({ ok: false, error: "sync_failed", details: err?.message });
  }
});

/**
 * Get current authed user row by authUserId
 */
userRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const authUserId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { authUserId },
      select: { id: true, authUserId: true, email: true, createdAt: true }
    });

    return res.json({ ok: true, user });
  } catch (err: any) {
    console.error("user/me error:", err);
    return res.status(500).json({ ok: false, error: "me_failed", details: err?.message });
  }
});
