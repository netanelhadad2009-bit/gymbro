import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "@fitjourney/db";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { devRouter } from "./routes/dev";
import { devEnvRouter } from "./routes/dev-env";
import { devAdminRouter } from "./routes/dev-admin";
import { aiRouter } from "./routes/ai";
import { planRouter } from "./routes/plan";

const app = express();

// CORS configuration with allowed origins from environment
const WEB_ORIGIN = process.env.NEXT_PUBLIC_WEB_ORIGIN || 'http://localhost:3000';
const ALLOWED_ORIGINS = [
  WEB_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173', // Vite/Expo dev server
];

// Remove duplicates
const uniqueOrigins = Array.from(new Set(ALLOWED_ORIGINS));

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Handle preflight requests
app.options('*', cors());

// Parse JSON with increased limit for AI responses
app.use(express.json({ limit: '5mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  next();
});

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

// AI routes
app.use("/ai", aiRouter);
app.use("/ai", planRouter);

const port = Number(process.env.PORT) || 3001;
const server = app.listen(port, () => {
  console.log(`\n🟢 API running on http://localhost:${port}`);
  console.log("✓ Mounted routes:");
  console.log("  /health, /db");
  console.log("  /auth/*");
  console.log("  /user/*");
  console.log("  /dev/*");
  console.log("  /ai/complete (legacy)");
  console.log("  /ai/days");
  console.log("  /ai/workout");
  console.log("  /ai/nutrition");
  console.log("  /ai/commit");
  console.log("  /ai/program/:userId");
  console.log(`\n📡 CORS allowed origins: ${uniqueOrigins.join(', ')}`);
  console.log(`   Web origin from env: ${WEB_ORIGIN}\n`);
});

// Increase timeout for long-running AI requests (2 minutes)
server.setTimeout(120000);