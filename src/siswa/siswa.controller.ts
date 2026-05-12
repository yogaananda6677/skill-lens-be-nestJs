import {
  Controller, Post, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SiswaService } from './siswa.service';

@Controller('siswa')
export class SiswaController {
  constructor(
    private siswaService: SiswaService,
  ) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @UploadedFile() file: any,
  ) {
    return this.siswaService.importExcel(file);
  }
}
