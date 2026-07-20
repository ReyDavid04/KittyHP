import { Module } from '@nestjs/common';
import { AccountAccessService } from './account-access.service';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService, AccountAccessService, MailService, AuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard],
})
export class AuthModule {}
