import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, RequestWithAuth } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username.trim(), loginDto.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: RequestWithAuth) {
    return request.user ?? null;
  }
}
