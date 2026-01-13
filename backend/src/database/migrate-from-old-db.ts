import * as pg from 'pg';
import { config } from 'dotenv';

config();

// Thông tin database cũ (source)
const SOURCE_CONFIG = {
  host: process.env.SOURCE_DB_HOST || '14.225.254.130',
  port: parseInt(process.env.SOURCE_DB_PORT || '5434', 10),
  database: process.env.SOURCE_DB_NAME || 'tsh_db',
  user: process.env.SOURCE_DB_USER || 'tsh_db',
  password: process.env.SOURCE_DB_PASSWORD || 'Tsh123qwe',
};

// Thông tin database mới (target)
const TARGET_CONFIG = {
  host: process.env.DATABASE_HOST || '14.225.254.130',
  port: parseInt(process.env.DATABASE_PORT || '5434', 10),
  database: process.env.DATABASE_NAME || 'Proxy992_new',
  user: process.env.DATABASE_USER || 'tsh_db',
  password: process.env.DATABASE_PASSWORD || 'Tsh123qwe',
};

interface TableMapping {
  sourceTable: string;
  targetTable: string;
  columnMapping?: Record<string, string>; // sourceColumn -> targetColumn
  skipColumns?: string[]; // Columns to skip
}

// Mapping các bảng từ database cũ sang database mới
const TABLE_MAPPINGS: TableMapping[] = [
  {
    sourceTable: 'users',
    targetTable: 'users',
    columnMapping: {
      id: 'id',
      email: 'email',
      password_hash: 'password_hash',
      quota_total: 'quota_total',
      quota_used: 'quota_used',
      active: 'active',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  {
    sourceTable: 'tokens',
    targetTable: 'tokens',
    columnMapping: {
      id: 'id',
      token: 'token',
      user_id: 'user_id',
      expired_at: 'expired_at',
      created_at: 'created_at',
    },
  },
  {
    sourceTable: 'socks5_proxies',
    targetTable: 'socks5_proxies',
    columnMapping: {
      id: 'id',
      host: 'host',
      port: 'port',
      username: 'username',
      password_encrypted: 'password_encrypted',
      status: 'status',
      last_check: 'last_check',
      consecutive_failures: 'consecutive_failures',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  },
  {
    sourceTable: 'socks5_upstreams',
    targetTable: 'socks5_upstreams',
  },
  {
    sourceTable: 'gateways',
    targetTable: 'gateways',
  },
  {
    sourceTable: 'gateway_ports',
    targetTable: 'gateway_ports',
  },
  {
    sourceTable: 'port_mappings',
    targetTable: 'port_mappings',
  },
  {
    sourceTable: 'user_proxy_purchases',
    targetTable: 'user_proxy_purchases',
  },
];

async function getSourceClient(): Promise<pg.Client> {
  const client = new pg.Client(SOURCE_CONFIG);
  await client.connect();
  return client;
}

async function getTableColumns(client: pg.Client, tableName: string, schema: string = 'public'): Promise<string[]> {
  const result = await client.query(
    `SELECT column_name 
     FROM information_schema.columns 
     WHERE table_schema = $1 AND table_name = $2 
     ORDER BY ordinal_position`,
    [schema, tableName]
  );
  return result.rows.map(row => row.column_name);
}

async function tableExists(client: pg.Client, tableName: string, schema: string = 'public'): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = $2
    )`,
    [schema, tableName]
  );
  return result.rows[0].exists;
}

async function migrateTable(
  sourceClient: pg.Client,
  targetClient: pg.Client,
  mapping: TableMapping
): Promise<number> {
  console.log(`\n📋 Migrating table: ${mapping.sourceTable} -> ${mapping.targetTable}`);

  // Kiểm tra bảng tồn tại trong source
  const sourceExists = await tableExists(sourceClient, mapping.sourceTable);
  if (!sourceExists) {
    console.log(`  ⚠️  Table ${mapping.sourceTable} không tồn tại trong source database, bỏ qua`);
    return 0;
  }

  // Kiểm tra bảng tồn tại trong target
  const targetExists = await tableExists(targetClient, mapping.targetTable);
  
  if (!targetExists) {
    console.log(`  ⚠️  Table ${mapping.targetTable} không tồn tại trong target database, bỏ qua`);
    return 0;
  }

  // Lấy danh sách cột từ source
  const sourceColumns = await getTableColumns(sourceClient, mapping.sourceTable);
  console.log(`  📊 Source columns: ${sourceColumns.join(', ')}`);

  // Lấy danh sách cột từ target
  const targetColumns = await getTableColumns(targetClient, mapping.targetTable);
  console.log(`  📊 Target columns: ${targetColumns.join(', ')}`);

  // Xác định cột nào sẽ copy
  const columnsToCopy: string[] = [];
  const targetColsForInsert: string[] = [];

  if (mapping.columnMapping) {
    // Sử dụng column mapping nếu có
    for (const [sourceCol, targetCol] of Object.entries(mapping.columnMapping)) {
      if (sourceColumns.includes(sourceCol) && targetColumns.includes(targetCol)) {
        columnsToCopy.push(sourceCol);
        targetColsForInsert.push(targetCol);
      }
    }
  } else {
    // Tự động map nếu tên cột giống nhau
    for (const col of sourceColumns) {
      if (targetColumns.includes(col) && !mapping.skipColumns?.includes(col)) {
        columnsToCopy.push(col);
        targetColsForInsert.push(col);
      }
    }
  }

  if (columnsToCopy.length === 0) {
    console.log(`  ⚠️  Không có cột nào để copy`);
    return 0;
  }

  console.log(`  🔄 Copying columns: ${columnsToCopy.join(', ')}`);

  // Lấy data từ source
  const selectQuery = `SELECT ${columnsToCopy.map(col => `"${col}"`).join(', ')} FROM "${mapping.sourceTable}"`;
  const sourceData = await sourceClient.query(selectQuery);

  if (sourceData.rows.length === 0) {
    console.log(`  ℹ️  Không có data để copy`);
    return 0;
  }

  console.log(`  📦 Found ${sourceData.rows.length} rows`);

  // Insert vào target (batch insert)
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < sourceData.rows.length; i += batchSize) {
    const batch = sourceData.rows.slice(i, i + batchSize);
    
    const values = batch.map((row, batchIdx) => {
      const placeholders = columnsToCopy.map((_, colIdx) => 
        `$${batchIdx * columnsToCopy.length + colIdx + 1}`
      ).join(', ');
      return `(${placeholders})`;
    }).join(', ');

    const flatValues = batch.flatMap(row => 
      columnsToCopy.map(col => row[col])
    );

    // Xây dựng query INSERT với ON CONFLICT
    // Tìm primary key column (thường là 'id')
    const primaryKeyCol = targetColsForInsert.includes('id') ? 'id' : null;
    const conflictClause = primaryKeyCol ? `ON CONFLICT ("${primaryKeyCol}") DO NOTHING` : '';

    const insertQuery = `
      INSERT INTO "${mapping.targetTable}" (${targetColsForInsert.map(col => `"${col}"`).join(', ')})
      VALUES ${values}
      ${conflictClause}
    `;

    try {
      const result = await targetClient.query(insertQuery, flatValues);
      insertedCount += batch.length;
    } catch (error) {
      console.error(`  ❌ Error inserting batch:`, error);
      // Thử insert từng row một nếu batch insert thất bại
      for (const row of batch) {
        try {
          const singleValues = columnsToCopy.map(col => row[col]);
          const singlePlaceholders = columnsToCopy.map((_, idx) => `$${idx + 1}`).join(', ');
          const singleInsertQuery = `
            INSERT INTO "${mapping.targetTable}" (${targetColsForInsert.map(col => `"${col}"`).join(', ')})
            VALUES (${singlePlaceholders})
            ${conflictClause}
          `;
          await targetClient.query(singleInsertQuery, singleValues);
          insertedCount++;
        } catch (singleError) {
          // Skip row nếu có lỗi
          console.error(`    ⚠️  Skip row due to error:`, singleError);
        }
      }
    }
  }

  console.log(`  ✅ Inserted ${insertedCount} rows`);
  return insertedCount;
}

async function main() {
  console.log('🚀 Bắt đầu migrate data từ database cũ sang database mới\n');
  
  console.log('📊 Thông tin database nguồn:');
  console.log(`  Host: ${SOURCE_CONFIG.host}:${SOURCE_CONFIG.port}`);
  console.log(`  Database: ${SOURCE_CONFIG.database}`);
  console.log(`  User: ${SOURCE_CONFIG.user}`);
  
  console.log('\n📊 Thông tin database đích:');
  console.log(`  Host: ${TARGET_CONFIG.host}:${TARGET_CONFIG.port}`);
  console.log(`  Database: ${TARGET_CONFIG.database}`);
  console.log(`  User: ${TARGET_CONFIG.user}`);

  let sourceClient: pg.Client | null = null;
  let targetClient: pg.Client | null = null;

  try {
    // Kết nối database nguồn
    console.log('\n🔌 Kết nối database nguồn...');
    sourceClient = await getSourceClient();
    console.log('✅ Đã kết nối database nguồn');

    // Kết nối database đích
    console.log('\n🔌 Kết nối database đích...');
    targetClient = new pg.Client(TARGET_CONFIG);
    await targetClient.connect();
    console.log('✅ Đã kết nối database đích');

    // Migrate từng bảng
    let totalMigrated = 0;
    for (const mapping of TABLE_MAPPINGS) {
      try {
        const count = await migrateTable(sourceClient, targetClient, mapping);
        totalMigrated += count;
      } catch (error) {
        console.error(`\n❌ Error migrating table ${mapping.sourceTable}:`, error);
        // Continue with next table
      }
    }

    console.log(`\n✨ Hoàn thành! Đã migrate ${totalMigrated} rows tổng cộng`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    if (sourceClient) {
      await sourceClient.end();
    }
    if (targetClient) {
      await targetClient.end();
    }
  }
}

main();
