import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function addPortColumn() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'proxyadmin',
    password: process.env.DATABASE_PASSWORD || 'changeme',
    database: process.env.DATABASE_NAME || 'Proxy96',
  });

  try {
    console.log('Checking if port column exists...');
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rotating_proxy_purchases' 
      AND column_name = 'port'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Port column already exists!');
      console.log('Please restart the backend server to reload TypeORM entities.');
      await pool.end();
      return;
    }

    console.log('Adding port column...');
    
    // Add port column
    await pool.query(`
      ALTER TABLE "rotating_proxy_purchases" 
      ADD COLUMN IF NOT EXISTS "port" integer
    `);

    console.log('✅ Port column added successfully!');

    // Add index
    console.log('Adding index on port column...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rotating_proxy_purchases_port" 
      ON "rotating_proxy_purchases" USING btree ("port") 
      WHERE "port" IS NOT NULL
    `);

    console.log('✅ Index added successfully!');
    console.log('Migration completed!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addPortColumn().catch((err) => {
  console.error('Failed to add port column:', err);
  process.exit(1);
});
