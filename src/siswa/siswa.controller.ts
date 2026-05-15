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

import { SiswaService } from './siswa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@Controller('siswa')
export class SiswaController {
  constructor(private siswaService: SiswaService) {}

  @UseGuards(JwtAuthGuard, new RoleGuard(['siswa']))
  @Get('me')
  getMe(@Req() req: any) {
    return this.siswaService.getMe(req.user.id_user);
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

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: any) {
    return this.siswaService.importExcel(file);
  }
}
