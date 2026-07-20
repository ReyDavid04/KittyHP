import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRepairDto {
  @IsDateString()
  recordDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  family!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  topIssue!: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  failureQty!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  buildQty!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @IsOptional()
  frPercentage?: number;

  @IsString()
  @IsNotEmpty()
  category!: string;

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
