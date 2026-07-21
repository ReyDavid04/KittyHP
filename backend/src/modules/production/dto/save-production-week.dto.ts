import { Type } from '@nestjs/class-transformer';
import { IsArray, IsDateString, IsInt, Min, ValidateNested } from 'class-validator';

export class ProductionDefectEntryDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  seriesId!: number;

  @IsDateString()
  recordDate!: string;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  inputQuantity!: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  defectQuantity!: number;
}

export class SaveProductionWeekDto {
  @IsDateString()
  weekStart!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionDefectEntryDto)
  entries!: ProductionDefectEntryDto[];
}
