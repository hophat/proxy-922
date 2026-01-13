import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/database/drizzle/schema.ts',
  out: './src/database/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'proxyadmin',
    password: process.env.DATABASE_PASSWORD || 'changeme',
    database: process.env.DATABASE_NAME || 'Proxy96',
  },
  verbose: true,
  strict: true,
} satisfies Config;
