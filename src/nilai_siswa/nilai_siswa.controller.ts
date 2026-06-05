import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import type { ImportNilaiExcelDto } from './dto/import-nilai-excel.dto';
import { NilaiSiswaService } from './nilai_siswa.service';
import type {
  ImportNilaiExcelResponse,
  MappingMapelResponse,
  ProfilAkademikResponse,
} from './nilai_siswa.service';

@Controller('nilai-siswa')
export class NilaiSiswaController {
  constructor(private readonly nilaiSiswaService: NilaiSiswaService) {}

  @UseGuards(JwtAuthGuard, new RoleGuard(['admin_sekolah', 'admin', 'superadmin']))
  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  importExcel(
    @UploadedFile() file: any,
    @Body() body: ImportNilaiExcelDto,
  ): Promise<ImportNilaiExcelResponse> {
    return this.nilaiSiswaService.importExcel(file, body);
  }

  @Get('mapping-mapel')
  getMappingMapel(): MappingMapelResponse {
    return this.nilaiSiswaService.getMappingMapel();
  }

  @UseGuards(JwtAuthGuard, new RoleGuard(['guru', 'admin_sekolah', 'admin', 'superadmin', 'siswa']))
  @Get('akademik/:idSiswa')
  getProfilAkademik(
    @Param('idSiswa', ParseIntPipe) idSiswa: number,
  ): Promise<ProfilAkademikResponse> {
    return this.nilaiSiswaService.getProfilAkademik(idSiswa);
  }
}
