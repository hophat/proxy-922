import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddProxyGatewayTables1767459760000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // SOCKS5 Upstreams table
    await queryRunner.createTable(
      new Table({
        name: 'socks5_upstreams',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'host',
            type: 'varchar',
          },
          {
            name: 'port',
            type: 'int',
          },
          {
            name: 'username',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'password_encrypted',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ping',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'zip',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isp',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['available', 'unavailable', 'maintenance', 'in_use'],
            default: "'available'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Gateways table
    await queryRunner.createTable(
      new Table({
        name: 'gateways',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'ip',
            type: 'varchar',
          },
          {
            name: 'port_range_start',
            type: 'int',
          },
          {
            name: 'port_range_end',
            type: 'int',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'maintenance', 'disabled'],
            default: "'active'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Gateway Ports table
    await queryRunner.createTable(
      new Table({
        name: 'gateway_ports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'gateway_id',
            type: 'uuid',
          },
          {
            name: 'port',
            type: 'int',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['available', 'assigned', 'reserved'],
            default: "'available'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Port Mappings table
    await queryRunner.createTable(
      new Table({
        name: 'port_mappings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'gateway_id',
            type: 'uuid',
          },
          {
            name: 'port_id',
            type: 'uuid',
          },
          {
            name: 'port',
            type: 'int',
          },
          {
            name: 'upstream_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'assigned_at',
            type: 'timestamp',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'released'],
            default: "'active'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // User Proxy Purchases table
    await queryRunner.createTable(
      new Table({
        name: 'user_proxy_purchases',
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
            name: 'port_id',
            type: 'uuid',
          },
          {
            name: 'mapping_id',
            type: 'uuid',
          },
          {
            name: 'purchased_at',
            type: 'timestamp',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'duration',
            type: 'enum',
            enum: ['24h', '7d', '30d'],
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
            name: 'gateway_username',
            type: 'varchar',
          },
          {
            name: 'gateway_password',
            type: 'varchar',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Foreign keys for gateway_ports
    await queryRunner.createForeignKey(
      'gateway_ports',
      new TableForeignKey({
        columnNames: ['gateway_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateways',
        onDelete: 'CASCADE',
      }),
    );

    // Foreign keys for port_mappings
    await queryRunner.createForeignKey(
      'port_mappings',
      new TableForeignKey({
        columnNames: ['gateway_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateways',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'port_mappings',
      new TableForeignKey({
        columnNames: ['port_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateway_ports',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'port_mappings',
      new TableForeignKey({
        columnNames: ['upstream_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'socks5_upstreams',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'port_mappings',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Foreign keys for user_proxy_purchases
    await queryRunner.createForeignKey(
      'user_proxy_purchases',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_proxy_purchases',
      new TableForeignKey({
        columnNames: ['gateway_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateways',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_proxy_purchases',
      new TableForeignKey({
        columnNames: ['port_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'gateway_ports',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_proxy_purchases',
      new TableForeignKey({
        columnNames: ['mapping_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'port_mappings',
        onDelete: 'CASCADE',
      }),
    );

    // Indexes for performance
    await queryRunner.createIndex(
      'port_mappings',
      new TableIndex({
        name: 'IDX_port_mappings_gateway_port',
        columnNames: ['gateway_id', 'port'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'port_mappings',
      new TableIndex({
        name: 'IDX_port_mappings_user_status',
        columnNames: ['user_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'user_proxy_purchases',
      new TableIndex({
        name: 'IDX_user_proxy_purchases_user_status',
        columnNames: ['user_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'user_proxy_purchases',
      new TableIndex({
        name: 'IDX_user_proxy_purchases_expires_at',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_proxy_purchases');
    await queryRunner.dropTable('port_mappings');
    await queryRunner.dropTable('gateway_ports');
    await queryRunner.dropTable('gateways');
    await queryRunner.dropTable('socks5_upstreams');
  }
}

