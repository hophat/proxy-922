import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmailOtpsTable1768200000000 implements MigrationInterface {
  name = 'CreateEmailOtpsTable1768200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_otps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
          },
          {
            name: 'code',
            type: 'varchar',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'used',
            type: 'boolean',
            default: false,
          },
          {
            name: 'used_at',
            type: 'timestamp',
            isNullable: true,
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

    // Create indexes
    await queryRunner.createIndex(
      'email_otps',
      new TableIndex({
        name: 'IDX_email_otps_email_code',
        columnNames: ['email', 'code'],
      }),
    );

    await queryRunner.createIndex(
      'email_otps',
      new TableIndex({
        name: 'IDX_email_otps_expires_at',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_otps');
  }
}
