import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateRotatingProxyPurchaseTable1768500000001 implements MigrationInterface {
  name = 'CreateRotatingProxyPurchaseTable1768500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create rotating_proxy_purchases table
    await queryRunner.createTable(
      new Table({
        name: 'rotating_proxy_purchases',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'order_id',
            type: 'uuid',
          },
          {
            name: 'domain',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'api_key',
            type: 'varchar',
            length: '64',
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'duration',
            type: 'enum',
            enum: ['24h', '1d', '3d', '7d', '15d', '30d'],
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'cancelled'],
            default: "'active'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'rotating_proxy_purchases',
      new TableIndex({
        name: 'IDX_rotating_proxy_purchases_user_status',
        columnNames: ['user_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'rotating_proxy_purchases',
      new TableIndex({
        name: 'IDX_rotating_proxy_purchases_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'rotating_proxy_purchases',
      new TableIndex({
        name: 'IDX_rotating_proxy_purchases_api_key',
        columnNames: ['api_key'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'rotating_proxy_purchases',
      new TableIndex({
        name: 'IDX_rotating_proxy_purchases_order_id',
        columnNames: ['order_id'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'rotating_proxy_purchases',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'rotating_proxy_purchases',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payment_orders',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    // Set lock timeout để tránh treo (10 giây)
    await queryRunner.query(`SET lock_timeout = '10s'`);
    await queryRunner.query(`SET statement_timeout = '15s'`);
    
    // Update PurchaseDuration enum type trong PostgreSQL
    // Tìm tên enum type được sử dụng cho cột duration
    const enumTypeResult = await queryRunner.query(`
      SELECT t.typname as enum_name
      FROM pg_type t
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'user_proxy_purchases' 
        AND a.attname = 'duration'
        AND t.typtype = 'e'
      LIMIT 1
    `);
    
    if (enumTypeResult.length > 0) {
      const enumTypeName = enumTypeResult[0].enum_name;
      
      // Lấy danh sách giá trị enum hiện tại
      const currentEnumValues = await queryRunner.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumTypeName}')
        ORDER BY enumsortorder
      `);
      
      const currentValues = currentEnumValues.map((row: any) => row.enumlabel);
      const newValues = ['1d', '3d', '15d'];
      
      // Thêm các giá trị enum mới nếu chưa có
      // Lưu ý: IF NOT EXISTS chỉ có trong PostgreSQL 9.5+
      // Với version cũ, bắt lỗi nếu giá trị đã tồn tại
      for (const newValue of newValues) {
        if (!currentValues.includes(newValue)) {
          try {
            await queryRunner.query(`
              ALTER TYPE ${enumTypeName} ADD VALUE '${newValue}'
            `);
          } catch (error: any) {
            // Bỏ qua lỗi nếu giá trị đã tồn tại (có thể do race condition)
            if (!error.message || !error.message.includes('already exists')) {
              throw error;
            }
          }
        }
      }
    }

    // Update PurchaseType enum type trong PostgreSQL
    // Tìm tên enum type được sử dụng cho cột purchase_type
    const purchaseTypeEnumResult = await queryRunner.query(`
      SELECT t.typname as enum_name
      FROM pg_type t
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'payment_orders' 
        AND a.attname = 'purchase_type'
        AND t.typtype = 'e'
      LIMIT 1
    `);
    
    if (purchaseTypeEnumResult.length > 0) {
      const purchaseTypeEnumName = purchaseTypeEnumResult[0].enum_name;
      
      // Lấy danh sách giá trị enum hiện tại
      const currentPurchaseTypeValues = await queryRunner.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '${purchaseTypeEnumName}')
        ORDER BY enumsortorder
      `);
      
      const currentPurchaseTypeValuesList = currentPurchaseTypeValues.map((row: any) => row.enumlabel);
      
      // Thêm giá trị 'rotating_proxy' nếu chưa có
      if (!currentPurchaseTypeValuesList.includes('rotating_proxy')) {
        try {
          await queryRunner.query(`
            ALTER TYPE ${purchaseTypeEnumName} ADD VALUE 'rotating_proxy'
          `);
        } catch (error: any) {
          // Bỏ qua lỗi nếu giá trị đã tồn tại (có thể do race condition)
          if (!error.message || !error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }
    
    // Reset timeouts về mặc định
    await queryRunner.query(`SET lock_timeout = DEFAULT`);
    await queryRunner.query(`SET statement_timeout = DEFAULT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('rotating_proxy_purchases');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('rotating_proxy_purchases', foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('rotating_proxy_purchases', 'IDX_rotating_proxy_purchases_order_id');
    await queryRunner.dropIndex('rotating_proxy_purchases', 'IDX_rotating_proxy_purchases_api_key');
    await queryRunner.dropIndex('rotating_proxy_purchases', 'IDX_rotating_proxy_purchases_expires_at');
    await queryRunner.dropIndex('rotating_proxy_purchases', 'IDX_rotating_proxy_purchases_user_status');

    // Drop table
    await queryRunner.dropTable('rotating_proxy_purchases');

    // Lưu ý: PostgreSQL không hỗ trợ xóa giá trị enum sau khi đã thêm
    // Các giá trị enum đã thêm ('1d', '3d', '15d', 'rotating_proxy') sẽ vẫn tồn tại
    // nhưng không ảnh hưởng đến logic vì code sẽ chỉ sử dụng các giá trị cũ
    // Nếu cần revert hoàn toàn, phải recreate enum type (không khuyến nghị)
    
    // Không thể revert enum values trong PostgreSQL, chỉ có thể tạo lại enum type
    // Để an toàn, không làm gì trong down() - giữ nguyên enum values đã thêm
  }
}
