-- CreateTable
CREATE TABLE "pending_decisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "message_id" TEXT,
    "action_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolved_at" DATETIME,
    "result" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "pending_decisions_status_idx" ON "pending_decisions"("status");
