import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAppVersionTable1768400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'app_versions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'platform',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'download_url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'release_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_mandatory',
            type: 'boolean',
            default: false,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'checksum',
            type: 'varchar',
            length: '64',
            isNullable: true,
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

    // Create unique index on platform and version
    await queryRunner.createIndex(
      'app_versions',
      new TableIndex({
        name: 'IDX_app_versions_platform_version',
        columnNames: ['platform', 'version'],
        isUnique: true,
      }),
    );

    // Create index on platform for faster queries
    await queryRunner.createIndex(
      'app_versions',
      new TableIndex({
        name: 'IDX_app_versions_platform',
        columnNames: ['platform'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('app_versions');
  }
}
