import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { RepairRepository } from '../repositories/repair.repository';

@Injectable()
export class CreateRepairUseCase {
  execute(
    createRepairDto: CreateRepairDto,
    createdByUserId: number,
    repairRepository: RepairRepository,
  ) {
    if (!Number.isInteger(createdByUserId) || createdByUserId <= 0) {
      throw new UnauthorizedException('No fue posible identificar al usuario que crea el reporte.');
    }

    return repairRepository.create(createRepairDto, createdByUserId);
  }
}
