-- Migration: Add shipping support fields
-- Brand: store address for origin
-- Product: weight for shipping calculation
-- Customer: address for destination
-- Order: destination reference

-- ─── Brand: Store Address ──────────────────────────────────────
ALTER TABLE "Brand" ADD COLUMN "storeAddress" TEXT;
ALTER TABLE "Brand" ADD COLUMN "storeCity" TEXT;
ALTER TABLE "Brand" ADD COLUMN "storeProvince" TEXT;
ALTER TABLE "Brand" ADD COLUMN "storeZip" TEXT;
ALTER TABLE "Brand" ADD COLUMN "storeOriginId" INTEGER;

-- ─── Product: Weight ───────────────────────────────────────────
ALTER TABLE "Product" ADD COLUMN "weight" INTEGER; -- gram

-- ─── Customer: Address ─────────────────────────────────────────
ALTER TABLE "Customer" ADD COLUMN "address" TEXT;
ALTER TABLE "Customer" ADD COLUMN "city" TEXT;
ALTER TABLE "Customer" ADD COLUMN "province" TEXT;
ALTER TABLE "Customer" ADD COLUMN "zip" TEXT;
ALTER TABLE "Customer" ADD COLUMN "destinationId" INTEGER;

-- ─── Order: Destination ────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN "destinationId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "shippingAddress" TEXT;
