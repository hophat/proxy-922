import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPortToRotatingProxyPurchase1768600000000 implements MigrationInterface {
  name = 'AddPortToRotatingProxyPurchase1768600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if port column already exists
    const table = await queryRunner.getTable('rotating_proxy_purchases');
    const portColumn = table?.findColumnByName('port');
    
    if (!portColumn) {
      // Add port column to rotating_proxy_purchases table
      await queryRunner.addColumn(
        'rotating_proxy_purchases',
        new TableColumn({
          name: 'port',
          type: 'integer',
          isNullable: true,
        }),
      );
    }

    // Add index on port for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_rotating_proxy_purchases_port 
      ON rotating_proxy_purchases(port) 
      WHERE port IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_rotating_proxy_purchases_port
    `);

    // Drop column
    await queryRunner.dropColumn('rotating_proxy_purchases', 'port');
  }
}
