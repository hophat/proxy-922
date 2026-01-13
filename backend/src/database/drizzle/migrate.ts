import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'proxyadmin',
    password: process.env.DATABASE_PASSWORD || 'changeme',
    database: process.env.DATABASE_NAME || 'Proxy96',
  });

  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/database/drizzle/migrations' });
  console.log('Migrations completed!');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
