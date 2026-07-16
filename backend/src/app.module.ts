import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairsModule } from './modules/repairs/repairs.module';
import { RepairEntity } from './modules/repairs/entities/repair.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', '10.95.103.20'),
        port: Number(configService.get<string>('DB_PORT', '3306')),
        username: configService.get<string>('DB_USER', 'Admin'),
        password: configService.get<string>('DB_PASSWORD', 'Lavidaesbella25@'),
        database: configService.get<string>('DB_NAME', 'kittyhp'),
        entities: [RepairEntity],
        synchronize: false,
      }),
    }),
    RepairsModule,
  ],
})
export class AppModule {}
