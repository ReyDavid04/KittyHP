import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRepairDto {
  @IsOptional()
  @IsBoolean()
  review?: boolean;
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
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  failureQty?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  buildQty?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0.01)
  frPercentage?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  returnYesQty?: number;

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
