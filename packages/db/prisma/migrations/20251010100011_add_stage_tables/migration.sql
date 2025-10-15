-- CreateTable: stage_library (master catalog)
CREATE TABLE "stage_library" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "order_index" INTEGER NOT NULL,
    "title_he" TEXT NOT NULL,
    "summary_he" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('workout', 'nutrition', 'habit', 'mixed')),
    "requirements" JSONB NOT NULL,
    "xp_reward" INTEGER NOT NULL DEFAULT 100,
    "icon" TEXT,
    "bg_color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: user_stage (user's personalized track)
CREATE TABLE "user_stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "stage_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked' CHECK ("status" IN ('locked', 'available', 'in_progress', 'completed')),
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "xp_current" INTEGER NOT NULL DEFAULT 0,
    "xp_total" INTEGER NOT NULL DEFAULT 100,
    "position" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "user_stage_stage_code_fkey" FOREIGN KEY ("stage_code") REFERENCES "stage_library"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "stage_library_order_index_key" ON "stage_library"("order_index");
CREATE INDEX "user_stage_user_id_idx" ON "user_stage"("user_id");
CREATE INDEX "user_stage_status_idx" ON "user_stage"("status");
CREATE UNIQUE INDEX "user_stage_user_id_stage_code_key" ON "user_stage"("user_id", "stage_code");
