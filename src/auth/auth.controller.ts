import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
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
