-- AlterTable
ALTER TABLE "x402_payments" ADD COLUMN     "price_timestamp" TIMESTAMP(3),
ADD COLUMN     "switchboard_confidence" DOUBLE PRECISION,
ADD COLUMN     "switchboard_price" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "oracle_count" INTEGER NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_snapshots_asset_idx" ON "price_snapshots"("asset");

-- CreateIndex
CREATE INDEX "price_snapshots_timestamp_idx" ON "price_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "price_snapshots_created_at_idx" ON "price_snapshots"("created_at");
