-- CreateTable
CREATE TABLE "support_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "support_conversations_reference_type_reference_id_idx" ON "support_conversations"("reference_type", "reference_id");
