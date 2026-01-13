import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class UpdatePortRangeAndAddPortChangeTracking1768300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Cập nhật port range của các gateway từ 10000-20000 sang 3000-10000
    await queryRunner.query(`
      UPDATE gateways 
      SET port_range_start = 3000, port_range_end = 10000 
      WHERE port_range_start = 10000 AND port_range_end = 20000
    `);

    // 2. Tạo bảng port_change_history để track lịch sử thay đổi port
    await queryRunner.createTable(
      new Table({
        name: 'port_change_history',
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
            name: 'gateway_id',
            type: 'uuid',
          },
          {
            name: 'port_mapping_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'old_port',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'new_port',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'old_gateway_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'new_gateway_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'change_type',
            type: 'enum',
            enum: ['port_change', 'gateway_change'],
          },
          {
            name: 'changed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 3. Tạo foreign keys
    await queryRunner.createForeignKey(
      'port_change_history',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'port_change_history',
      new TableForeignKey({
        columnNames: ['gateway_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateways',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'port_change_history',
      new TableForeignKey({
        columnNames: ['port_mapping_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'port_mappings',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'port_change_history',
      new TableForeignKey({
        columnNames: ['old_gateway_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateways',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'port_change_history',
      new TableForeignKey({
        columnNames: ['new_gateway_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateways',
        onDelete: 'SET NULL',
      }),
    );

    // 4. Tạo indexes để query cooldown nhanh
    await queryRunner.createIndex(
      'port_change_history',
      new TableIndex({
        name: 'IDX_port_change_history_user_gateway_changed',
        columnNames: ['user_id', 'gateway_id', 'changed_at'],
      }),
    );

    await queryRunner.createIndex(
      'port_change_history',
      new TableIndex({
        name: 'IDX_port_change_history_port_mapping',
        columnNames: ['port_mapping_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa indexes
    await queryRunner.dropIndex('port_change_history', 'IDX_port_change_history_user_gateway_changed');
    await queryRunner.dropIndex('port_change_history', 'IDX_port_change_history_port_mapping');

    // Xóa foreign keys
    const table = await queryRunner.getTable('port_change_history');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('port_change_history', foreignKey);
      }
    }

    // Xóa bảng
    await queryRunner.dropTable('port_change_history');

    // Khôi phục port range về 10000-20000 (nếu cần)
    await queryRunner.query(`
      UPDATE gateways 
      SET port_range_start = 10000, port_range_end = 20000 
      WHERE port_range_start = 3000 AND port_range_end = 10000
    `);
  }
}
