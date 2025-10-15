-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "days_estimate" INTEGER NOT NULL,
    "workout_plan_text" TEXT NOT NULL,
    "nutrition_plan_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programs_user_id_key" ON "programs"("user_id");
