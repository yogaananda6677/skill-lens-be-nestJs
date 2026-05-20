import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { AdminSekolahService } from './admin_sekolah.service';
import { CreateAdminSchoolDto } from './dto/create-admin-school.dto';
import { CreateAdminTeacherDto } from './dto/create-admin-teacher.dto';
import { NilaiSiswaService } from '../nilai_siswa/nilai_siswa.service';

@Controller('admin-sekolah')
@UseGuards(JwtAuthGuard, new RoleGuard(['admin_sekolah']))
export class AdminSekolahController {
  constructor(
    private readonly adminSekolahService: AdminSekolahService,
    private readonly nilaiSiswaService: NilaiSiswaService,
  ) {}

  @Get('status')
  getStatus(@Req() req: any) {
    return this.adminSekolahService.getStatus(req.user.id);
  }

  @Post('sekolah')
  createOrUpdateSchool(
    @Req() req: any,
    @Body() dto: CreateAdminSchoolDto,
  ) {
    return this.adminSekolahService.createOrUpdateSchool(req.user.id, dto);
  }

  @Get('guru')
  listTeachers(@Req() req: any) {
    return this.adminSekolahService.listTeachers(req.user.id);
  }

  @Post('guru')
  createTeacher(
    @Req() req: any,
    @Body() dto: CreateAdminTeacherDto,
  ) {
    return this.adminSekolahService.createTeacher(req.user.id, dto);
  }

  @Get('jurusan')
  listJurusan(@Req() req: any) {
    return this.adminSekolahService.listJurusan(req.user.id);
  }

  @Post('jurusan')
  createJurusan(@Req() req: any, @Body() body: any) {
    return this.adminSekolahService.createJurusan(req.user.id, body);
  }

  @Get('siswa')
  listSiswa(@Req() req: any, @Query() query: any) {
    return this.adminSekolahService.listSiswa(req.user.id, query);
  }

  @Post('siswa/import')
  @UseInterceptors(FileInterceptor('file'))
  async importSiswa(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('File Excel siswa wajib diunggah.');
    }

    const sekolah = await this.adminSekolahService.getApprovedSchoolOrFail(
      req.user.id,
    );

    const idJurusan = Number(
      body?.id_jurusan ?? body?.idJurusan ?? body?.jurusanId ?? 0,
    );

    if (!idJurusan) {
      throw new BadRequestException('Jurusan wajib dipilih sebelum import.');
    }

   

    return this.nilaiSiswaService.importExcel(file, {
      sekolahId: sekolah.id_sekolah,
      jurusanId: idJurusan,
      jenisSekolah: sekolah.jenis_sekolah || 'SMA',
      tujuanKarir: 'kuliah',
      topN: 3,
      dryRun: false,
    });
  }
}