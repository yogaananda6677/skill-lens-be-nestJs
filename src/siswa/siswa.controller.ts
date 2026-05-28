import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { SiswaService } from './siswa.service';

@Controller('siswa')
export class SiswaController {
  constructor(private readonly siswaService: SiswaService) {}

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Get('me')
  getMe(@Req() req: any) {
    return this.siswaService.getMe(req.user.id_user);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Get('nilai')
  getNilaiAkademikDetail(@Req() req: any) {
    return this.siswaService.getNilaiAkademikDetail(req.user.id_user);
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Put('profil')
  updateProfil(@Req() req: any, @Body() body: any) {
    return this.siswaService.updateProfil(req.user.id_user, body);
  }

@UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
@Post('spk')
prosesSpk(@Req() req: any, @Body() body: any) {
  return this.siswaService.prosesSpk(req.user.id_user, body);
}

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Get('spk/latest')
  getLatestSpk(@Req() req: any) {
    return this.siswaService.getLatestSpk(req.user.id_user);
  }

  @UseGuards(
    JwtAuthGuard,
    new RoleGuard(['guru', 'admin_sekolah', 'admin', 'superadmin']),
  )
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importExcel(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    return this.siswaService.importExcel(file, req.user, body);
  }
}