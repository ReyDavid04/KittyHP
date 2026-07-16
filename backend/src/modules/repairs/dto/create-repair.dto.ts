import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRepairDto {
  @IsDateString()
  recordDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  topIssue!: string;

  @IsNumber()
  @Min(0)
  failureQty!: number;

  @IsNumber()
  @Min(0)
  buildQty!: number;

  @IsNumber()
  @Min(0)
  frPercentage!: number;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsBoolean()
  @IsOptional()
  isReturned?: boolean;

  @IsString()
  @IsOptional()
  returnStatus?: string;

  @IsString()
  @IsOptional()
  failPicture?: string;

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
  evidencePicture?: string;
}
