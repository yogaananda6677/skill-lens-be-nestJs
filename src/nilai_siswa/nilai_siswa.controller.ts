import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file'))
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

  @Get('akademik/:idSiswa')
  getProfilAkademik(
    @Param('idSiswa', ParseIntPipe) idSiswa: number,
  ): Promise<ProfilAkademikResponse> {
    return this.nilaiSiswaService.getProfilAkademik(idSiswa);
  }
}
