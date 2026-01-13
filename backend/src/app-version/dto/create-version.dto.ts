import { IsString, IsUrl, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  platform: string; // 'win32' | 'darwin' | 'linux'

  @IsUrl()
  @MaxLength(500)
  downloadUrl: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksum?: string;
}

export class UpdateVersionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  platform?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  downloadUrl?: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksum?: string;
}
