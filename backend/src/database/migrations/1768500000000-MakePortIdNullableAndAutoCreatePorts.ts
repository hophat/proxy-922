import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MakePortIdNullableAndAutoCreatePorts1768500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Làm portId nullable trong port_mappings
    await queryRunner.changeColumn(
      'port_mappings',
      'port_id',
      new TableColumn({
        name: 'port_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 2. Làm portId nullable trong user_proxy_purchases
    await queryRunner.changeColumn(
      'user_proxy_purchases',
      'port_id',
      new TableColumn({
        name: 'port_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 3. Tạo index trên (gateway_id, port) để đảm bảo unique port trong mỗi gateway
    // (Index này đã có từ migration trước, nhưng đảm bảo nó tồn tại)
    const table = await queryRunner.getTable('port_mappings');
    const existingIndex = table?.indices.find(
      (idx) => idx.columnNames.includes('gateway_id') && idx.columnNames.includes('port'),
    );
    
    if (!existingIndex) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_port_mappings_gateway_port" 
        ON "port_mappings" ("gateway_id", "port")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Khôi phục portId thành NOT NULL (cần đảm bảo không có NULL values trước)
    await queryRunner.query(`
      UPDATE port_mappings 
      SET port_id = (SELECT id FROM gateway_ports WHERE gateway_ports.gateway_id = port_mappings.gateway_id AND gateway_ports.port = port_mappings.port LIMIT 1)
      WHERE port_id IS NULL
    `);

    await queryRunner.changeColumn(
      'port_mappings',
      'port_id',
      new TableColumn({
        name: 'port_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.changeColumn(
      'user_proxy_purchases',
      'port_id',
      new TableColumn({
        name: 'port_id',
        type: 'uuid',
        isNullable: false,
      }),
    );
  }
}
