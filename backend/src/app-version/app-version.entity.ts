import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('app_versions')
@Index(['platform', 'version'], { unique: true })
export class AppVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'varchar', length: 20 })
  platform: string; // 'win32' | 'darwin' | 'linux'

  @Column({ name: 'download_url', type: 'varchar', length: 500 })
  downloadUrl: string;

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string;

  @Column({ name: 'is_mandatory', type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string; // SHA256 hash

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
