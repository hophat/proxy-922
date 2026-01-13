import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMappingIdAndRotationIntervalToRotatingProxy1768700000000 implements MigrationInterface {
  name = 'AddMappingIdAndRotationIntervalToRotatingProxy1768700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add mapping_id column
    await queryRunner.addColumn(
      'rotating_proxy_purchases',
      new TableColumn({
        name: 'mapping_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add rotation_interval column with default value 5
    await queryRunner.addColumn(
      'rotating_proxy_purchases',
      new TableColumn({
        name: 'rotation_interval',
        type: 'integer',
        isNullable: true,
        default: 5,
      }),
    );

    // Update existing rows to have default rotation_interval of 5
    await queryRunner.query(`
      UPDATE rotating_proxy_purchases 
      SET rotation_interval = 5 
      WHERE rotation_interval IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns
    await queryRunner.dropColumn('rotating_proxy_purchases', 'rotation_interval');
    await queryRunner.dropColumn('rotating_proxy_purchases', 'mapping_id');
  }
}
