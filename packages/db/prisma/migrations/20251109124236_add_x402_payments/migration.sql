-- CreateTable
CREATE TABLE "x402_payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "x402_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "x402_payments_signature_key" ON "x402_payments"("signature");

-- CreateIndex
CREATE INDEX "x402_payments_user_id_idx" ON "x402_payments"("user_id");

-- CreateIndex
CREATE INDEX "x402_payments_signature_idx" ON "x402_payments"("signature");

-- CreateIndex
CREATE INDEX "x402_payments_status_idx" ON "x402_payments"("status");

-- AddForeignKey
ALTER TABLE "x402_payments" ADD CONSTRAINT "x402_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
