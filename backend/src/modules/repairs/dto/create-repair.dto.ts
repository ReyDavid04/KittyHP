import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRepairDto {
  @IsDateString()
  @IsOptional()
  recordDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  family?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  topIssue?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  failureQty?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  buildQty?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  frPercentage?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @Transform(({ value }) => value === '' || value === null ? null : Number(value))
  @IsOptional()
  returnYesQty?: number | null;

  @IsInt()
  @Transform(({ value }) => value === '' || value === null ? null : Number(value))
  @Min(0)
  @IsOptional()
  returnNoQty?: number | null;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  returnNoManual?: boolean;

  @IsString()
  @IsOptional()
  failPicture?: string | null;

  @IsString()
  @IsOptional()
  majorPart?: string;

  @IsString()
  @IsOptional()
  repairResult?: string;

  @IsString()
  @IsOptional()
  failureFactor?: string;

  @IsString()
  @IsOptional()
  actions?: string;

  @IsString()
  @IsOptional()
  evidencePicture?: string | null;

  @IsOptional()
  details?: string | Record<string, unknown>[];
}
