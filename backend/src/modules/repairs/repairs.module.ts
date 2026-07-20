import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RepairsController } from './controllers/repairs.controller';
import { RepairEntity } from './entities/repair.entity';
import { RepairRepository } from './repositories/repair.repository';
import { RepairReturnMigrationService } from './services/repair-return-migration.service';
import { RepairsService } from './services/repairs.service';
import { CreateRepairUseCase } from './use-cases/create-repair.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([RepairEntity]), AuthModule],
  controllers: [RepairsController],
  providers: [RepairRepository, RepairsService, RepairReturnMigrationService, CreateRepairUseCase],
})
export class RepairsModule {}
