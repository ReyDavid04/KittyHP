import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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

  @IsInt()
  @Type(() => Number)
  @Min(1)
  failureQty!: number;

  @IsInt()
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

  @IsInt()
  @Type(() => Number)
  @Min(0)
  returnYesQty!: number;

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
