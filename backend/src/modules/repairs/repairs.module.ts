import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairsController } from './controllers/repairs.controller';
import { RepairEntity } from './entities/repair.entity';
import { RepairRepository } from './repositories/repair.repository';
import { RepairsService } from './services/repairs.service';
import { CreateRepairUseCase } from './use-cases/create-repair.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([RepairEntity])],
  controllers: [RepairsController],
  providers: [RepairRepository, RepairsService, CreateRepairUseCase],
})
export class RepairsModule {}
