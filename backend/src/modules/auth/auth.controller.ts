import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AccountAccessService } from './account-access.service';
import { AuthGuard, RequestWithAuth } from './auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountAccessService: AccountAccessService,
  ) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email.trim(), loginDto.password);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.accountAccessService.register(registerDto.email, registerDto.password);
  }

  @Post('verify-registration')
  verifyRegistration(@Body() verifyDto: VerifyRegistrationDto) {
    return this.accountAccessService.verifyRegistration(verifyDto.email, verifyDto.code);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.accountAccessService.requestPasswordReset(forgotPasswordDto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.accountAccessService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.password,
    );
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: RequestWithAuth) {
    return request.user ?? null;
  }
}
