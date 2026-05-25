import {
  BadRequestException,
  Body,
  Controller,
  Get, Res,
  Post,Put,
  Query,Delete,
  Req,Param,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { AdminSekolahService } from './admin_sekolah.service';
import { CreateAdminSchoolDto } from './dto/create-admin-school.dto';
import { CreateAdminTeacherDto } from './dto/create-admin-teacher.dto';
import { NilaiSiswaService } from '../nilai_siswa/nilai_siswa.service';
import { MataPelajaranService } from '../mata_pelajaran/mata_pelajaran.service'; // ✅ import

@Controller('admin-sekolah')
@UseGuards(JwtAuthGuard, new RoleGuard(['admin_sekolah']))
export class AdminSekolahController {
  constructor(
    private readonly adminSekolahService: AdminSekolahService,
    private readonly nilaiSiswaService: NilaiSiswaService,
    private readonly mataPelajaranService: MataPelajaranService, // ✅ tambahkan
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

  @Get('mata-pelajaran')
  async getMataPelajaran(@Req() req: any) {
    const id_sekolah = req.user?.id_sekolah;
    const data = await this.mataPelajaranService.findAllBySekolah(id_sekolah);
    return { data };
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

  @Post('mata-pelajaran')
  async createMataPelajaran(@Req() req: any, @Body() body: any) {
    const { nama_mapel, id_jurusan } = body;
    if (!nama_mapel || !id_jurusan) {
      throw new BadRequestException('Nama mapel dan jurusan wajib diisi');
    }
    const id_sekolah = req.user?.id_sekolah;
    const newMapel = await this.mataPelajaranService.create({
      nama_mapel,
      tipe_mapel: 'jurusan',
      id_jurusan,
      id_sekolah,
      is_default: false,
    });
    return { message: 'Mata pelajaran berhasil ditambahkan', data: newMapel };
  }

  @Put('mata-pelajaran/:id')
  async updateMataPelajaran(@Param('id') id: number, @Body() body: any) {
    const { nama_mapel, id_jurusan } = body;
    const updated = await this.mataPelajaranService.update(id, {
      nama_mapel,
      id_jurusan,
    });
    return { message: 'Mata pelajaran diperbarui', data: updated };
  }

  @Delete('mata-pelajaran/:id')
  async deleteMataPelajaran(@Param('id') id: number) {
    await this.mataPelajaranService.delete(id);
    return { message: 'Mata pelajaran dihapus' };
  }

  @Get('nilai/template')
  async downloadTemplate(@Query('jurusanId') jurusanId: string, @Res() res) {
    const buffer = await this.nilaiSiswaService.getTemplateNilaiByJurusan(Number(jurusanId));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_nilai.xlsx');
    res.send(buffer);
  }

  @Get('siswa/:id/nilai')
  async getNilaiSiswa(@Param('id') id: string, @Req() req: any) {
    return this.adminSekolahService.getNilaiSiswa(+id, req.user.id);
  }
}