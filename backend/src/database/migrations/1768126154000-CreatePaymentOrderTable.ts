import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePaymentOrderTable1768126154000 implements MigrationInterface {
  name = 'CreatePaymentOrderTable1768126154000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'sepay_order_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'order_code',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'paid', 'expired', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'purchase_type',
            type: 'enum',
            enum: ['upstream', 'port'],
          },
          {
            name: 'purchase_data',
            type: 'jsonb',
          },
          {
            name: 'va_number',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'qr_code_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'expired_at',
            type: 'timestamp',
          },
          {
            name: 'paid_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sepay_transaction_id',
            type: 'varchar',
            isNullable: true,
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
      'payment_orders',
      new TableIndex({
        name: 'IDX_payment_orders_order_code',
        columnNames: ['order_code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'payment_orders',
      new TableIndex({
        name: 'IDX_payment_orders_user_status',
        columnNames: ['user_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'payment_orders',
      new TableIndex({
        name: 'IDX_payment_orders_expired_at',
        columnNames: ['expired_at'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'payment_orders',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('payment_orders');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('payment_orders', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('payment_orders', 'IDX_payment_orders_expired_at');
    await queryRunner.dropIndex('payment_orders', 'IDX_payment_orders_user_status');
    await queryRunner.dropIndex('payment_orders', 'IDX_payment_orders_order_code');

    // Drop table
    await queryRunner.dropTable('payment_orders');
  }
}
