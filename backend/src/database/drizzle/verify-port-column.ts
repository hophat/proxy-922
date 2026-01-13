import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyPortColumn() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'proxyadmin',
    password: process.env.DATABASE_PASSWORD || 'changeme',
    database: process.env.DATABASE_NAME || 'Proxy96',
  });

  try {
    console.log('Verifying port column in rotating_proxy_purchases table...');
    
    // Check if column exists
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'rotating_proxy_purchases' 
      AND column_name = 'port'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Port column does NOT exist!');
      console.log('Running migration to add port column...');
      
      await pool.query(`
        ALTER TABLE "rotating_proxy_purchases" 
        ADD COLUMN "port" integer
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_rotating_proxy_purchases_port" 
        ON "rotating_proxy_purchases" USING btree ("port") 
        WHERE "port" IS NOT NULL
      `);

      console.log('✅ Port column added successfully!');
    } else {
      const column = result.rows[0];
      console.log('✅ Port column exists!');
      console.log('Column details:', {
        name: column.column_name,
        type: column.data_type,
        nullable: column.is_nullable,
        default: column.column_default,
      });
    }

    // Check index
    const indexResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'rotating_proxy_purchases' 
      AND indexname = 'IDX_rotating_proxy_purchases_port'
    `);

    if (indexResult.rows.length > 0) {
      console.log('✅ Index on port column exists!');
    } else {
      console.log('⚠️  Index on port column does not exist, creating...');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_rotating_proxy_purchases_port" 
        ON "rotating_proxy_purchases" USING btree ("port") 
        WHERE "port" IS NOT NULL
      `);
      console.log('✅ Index created!');
    }

    console.log('\n✅ Verification complete!');
    console.log('⚠️  Please restart the backend server to reload TypeORM metadata.');
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyPortColumn().catch((err) => {
  console.error('Failed to verify port column:', err);
  process.exit(1);
});
