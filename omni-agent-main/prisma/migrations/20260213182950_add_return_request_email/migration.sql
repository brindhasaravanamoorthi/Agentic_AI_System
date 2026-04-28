/*
  Warnings:

  - Added the required column `email` to the `return_requests` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_return_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reason_detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "refund_amount" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "return_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_return_requests" ("created_at", "customer_id", "id", "notes", "order_id", "reason", "reason_detail", "refund_amount", "status", "type", "updated_at") SELECT "created_at", "customer_id", "id", "notes", "order_id", "reason", "reason_detail", "refund_amount", "status", "type", "updated_at" FROM "return_requests";
DROP TABLE "return_requests";
ALTER TABLE "new_return_requests" RENAME TO "return_requests";
CREATE INDEX "return_requests_order_id_idx" ON "return_requests"("order_id");
CREATE INDEX "return_requests_customer_id_idx" ON "return_requests"("customer_id");
CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
