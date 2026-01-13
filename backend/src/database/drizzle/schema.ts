import { pgTable, uuid, varchar, timestamp, decimal, pgEnum, integer, index } from 'drizzle-orm/pg-core';

// Enums
export const purchaseDurationEnum = pgEnum('purchase_duration', [
  '24h',
  '1d',
  '3d',
  '7d',
  '15d',
  '30d',
]);

export const purchaseStatusEnum = pgEnum('purchase_status', [
  'active',
  'expired',
  'cancelled',
]);

// Rotating Proxy Purchases Table
export const rotatingProxyPurchases = pgTable(
  'rotating_proxy_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    orderId: uuid('order_id').notNull(),
    domain: varchar('domain', { length: 255 }).notNull(),
    apiKey: varchar('api_key', { length: 64 }).notNull().unique(),
    port: integer('port'),
    expiresAt: timestamp('expires_at').notNull(),
    duration: purchaseDurationEnum('duration').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    status: purchaseStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdStatusIdx: index('IDX_rotating_proxy_purchases_user_status').on(
      table.userId,
      table.status,
    ),
    expiresAtIdx: index('IDX_rotating_proxy_purchases_expires_at').on(
      table.expiresAt,
    ),
    apiKeyIdx: index('IDX_rotating_proxy_purchases_api_key').on(table.apiKey),
    orderIdIdx: index('IDX_rotating_proxy_purchases_order_id').on(table.orderId),
    portIdx: index('IDX_rotating_proxy_purchases_port').on(table.port),
  }),
);
