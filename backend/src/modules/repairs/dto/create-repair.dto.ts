import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
  @Type(() => Number)
  @IsOptional()
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
