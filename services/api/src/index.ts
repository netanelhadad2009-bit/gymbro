import "dotenv/config";
import express from "express";
import express from "express";
import cors from "cors";
import cors from "cors";
import { prisma } from "@gymbro/db";
import { prisma } from "@gymbro/db";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { devRouter } from "./routes/dev";
import { devEnvRouter } from "./routes/dev-env";
import { devAdminRouter } from "./routes/dev-admin";
import { userRouter } from "./routes/user";

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get("/health", (_req, res) => res.json({ ok: true, service: "api" }));

// DB health check
app.get("/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`select 1`;
    res.json({ ok: true, db: "up" });
  } catch (err) {
    console.error("DB health error:", err);
    res.status(500).json({ ok: false, db: "down" });
  }
});

// Auth routes
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/auth", userRouter); // <-- /auth/sync

// Dev routes (disabled in production by each route)
app.use("/dev", devRouter);
app.use("/dev", devEnvRouter);
app.use("/dev", devAdminRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
