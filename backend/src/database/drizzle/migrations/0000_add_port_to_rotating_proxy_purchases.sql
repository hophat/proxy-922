-- Add port column to rotating_proxy_purchases table
ALTER TABLE "rotating_proxy_purchases" ADD COLUMN IF NOT EXISTS "port" integer;

-- Add index on port for faster lookups (only on non-null values)
CREATE INDEX IF NOT EXISTS "IDX_rotating_proxy_purchases_port" ON "rotating_proxy_purchases" USING btree ("port") WHERE "port" IS NOT NULL;
