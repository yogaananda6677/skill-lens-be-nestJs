import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RoleGuard } from './role';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.username, body.password);
  }

  @Post('register-admin-sekolah')
  registerAdminSekolah(@Body() body: any) {
    return this.authService.registerAdminSekolah(body);
  }

  @Post('register-guru')
  registerGuru(@Body() body: any) {
    return this.authService.registerGuru(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id_user ?? req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  updateMe(@Req() req: any, @Body() body: any) {
    return this.authService.updateMe(req.user.id_user ?? req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-default-password')
  changeDefaultPassword(@Req() req: any, @Body() body: any) {
    return this.authService.changeDefaultPassword(
      req.user.id_user ?? req.user.id,
      body,
    );
  }

  @Post('forgot-password/request-otp')
  requestForgotPasswordOtp(@Body() body: any) {
    return this.authService.requestForgotPasswordOtp(body);
  }

  @Post('forgot-password/reset')
  resetForgotPassword(@Body() body: any) {
    return this.authService.resetForgotPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request-password-otp')
  requestPasswordOtp(@Req() req: any, @Body() body: any) {
    return this.authService.requestPasswordOtp(
      req.user.id_user ?? req.user.id,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password-with-otp')
  changePasswordWithOtp(@Req() req: any, @Body() body: any) {
    return this.authService.changePasswordWithOtp(
      req.user.id_user ?? req.user.id,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() body: any) {
    return this.authService.changePassword(
      req.user.id_user ?? req.user.id,
      body,
    );
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['superadmin', 'admin']))
  @Get('admin')
  adminOnly() {
    return 'halaman admin';
  }

  @Get('check-availability')
  checkAvailability(
    @Query('username') username?: string,
    @Query('email') email?: string,
  ) {
    return this.authService.checkAvailability(username, email);
  }
}