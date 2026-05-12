import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from './role';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile() {
    return "data aman";
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['admin']))
  @Get('admin')
  adminOnly() {
    return 'halaman admin';
  }
}