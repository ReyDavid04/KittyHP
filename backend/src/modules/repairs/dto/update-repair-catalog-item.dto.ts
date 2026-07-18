import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRepairCatalogItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  value?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
