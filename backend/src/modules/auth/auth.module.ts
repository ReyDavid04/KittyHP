import { Module } from '@nestjs/common';
import { AccountAccessService } from './account-access.service';
import { AdminGuard } from './admin.guard';
import { EditorGuard } from './editor.guard';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { UsersController } from './users.controller';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  controllers: [AuthController, UsersController, ActivityController],
  providers: [AuthService, ActivityService, AccountAccessService, MailService, AuthGuard, AdminGuard, EditorGuard],
  exports: [AuthService, ActivityService, AuthGuard, AdminGuard, EditorGuard],
})
export class AuthModule {}
