import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRepairDto {
  @IsDateString()
  @IsOptional()
  recordDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  topIssue?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  failureQty?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  buildQty?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  frPercentage?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isReturned?: boolean;

  @IsString()
  @IsOptional()
  returnStatus?: string;

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
}
