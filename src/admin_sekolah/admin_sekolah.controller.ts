import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
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

  @Put('jurusan/:id')
  updateJurusan(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminSekolahService.updateJurusan(
      req.user.id,
      Number(id),
      body,
    );
  }

  @Delete('jurusan/:id')
  deleteJurusan(@Req() req: any, @Param('id') id: string) {
    return this.adminSekolahService.deleteJurusan(req.user.id, Number(id));
  }

  @Get('mata-pelajaran')
  listMataPelajaran(@Req() req: any) {
    return this.adminSekolahService.listMataPelajaran(req.user.id);
  }

  @Post('mata-pelajaran')
  createMataPelajaran(@Req() req: any, @Body() body: any) {
    return this.adminSekolahService.createMataPelajaran(req.user.id, body);
  }

  @Put('mata-pelajaran/:id')
  updateMataPelajaran(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminSekolahService.updateMataPelajaran(
      req.user.id,
      Number(id),
      body,
    );
  }

  @Delete('mata-pelajaran/:id')
  deleteMataPelajaran(@Req() req: any, @Param('id') id: string) {
    return this.adminSekolahService.deleteMataPelajaran(
      req.user.id,
      Number(id),
    );
  }

  @Post('mata-pelajaran/default-umum')
  createDefaultMataPelajaranUmum(@Req() req: any) {
    return this.adminSekolahService.createDefaultMataPelajaranUmum(req.user.id);
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
      throw new BadRequestException('File Excel nilai wajib diunggah.');
    }

    const sekolah = await this.adminSekolahService.getApprovedSchoolOrFail(
      req.user.id,
    );

    const jenisSekolah = String(sekolah.jenis_sekolah || 'SMA').toUpperCase();
    const isSma = jenisSekolah === 'SMA';

    const isMultiSemester =
      String(body?.multi_semester ?? body?.multiSemester ?? '').toLowerCase() ===
      'true';

    const mode =
      String(body?.mode || '').trim() ||
      (isSma ? 'sma_multi_jurusan' : 'smk_multi_sheet');

    if (isMultiSemester) {
      const idJurusan = Number(
        body?.id_jurusan ?? body?.idJurusan ?? body?.jurusanId ?? 0,
      );

      if (!isSma && !idJurusan) {
        throw new BadRequestException(
          'Pilih jurusan SMK terlebih dahulu sebelum import nilai.',
        );
      }

      return this.nilaiSiswaService.importExcel(file, {
        sekolahId: sekolah.id_sekolah,
        jurusanId: idJurusan || null,
        semester: null,
        jenisSekolah,
        tujuanKarir: 'kuliah',
        topN: 3,
        dryRun: false,

        // Mode baru: backend baca semua sheet Excel.
        multiSemester: true,
        mode,
        semesterStart: isSma
          ? Number(body?.semester_start ?? body?.semesterStart ?? 1)
          : 1,
        semesterEnd: isSma
          ? Number(body?.semester_end ?? body?.semesterEnd ?? 6)
          : 6,
      } as any);
    }

    /**
     * Fallback mode lama.
     * Ini tetap disimpan supaya endpoint lama tidak langsung rusak,
     * tapi frontend baru seharusnya selalu mengirim multi_semester=true.
     */
    const semester = Number(body?.semester ?? 0);

    const isSemesterUmumSma = isSma && (semester === 1 || semester === 2);
    const isSemesterJurusanSma = isSma && [3, 4, 5, 6].includes(semester);

    const idJurusan = Number(
      body?.id_jurusan ?? body?.idJurusan ?? body?.jurusanId ?? 0,
    );

    if (isSma && ![1, 2, 3, 4, 5, 6].includes(semester)) {
      throw new BadRequestException(
        'Semester wajib dipilih untuk import nilai SMA.',
      );
    }

    if (!isSma && !idJurusan) {
      throw new BadRequestException(
        'Jurusan wajib dipilih untuk import nilai SMK.',
      );
    }

    if (isSemesterJurusanSma && !idJurusan) {
      throw new BadRequestException(
        'Jurusan wajib dipilih untuk import nilai SMA semester 3 sampai 6.',
      );
    }

    return this.nilaiSiswaService.importExcel(file, {
      sekolahId: sekolah.id_sekolah,
      jurusanId: isSemesterUmumSma ? null : idJurusan,
      semester: isSma ? semester : null,
      jenisSekolah,
      tujuanKarir: 'kuliah',
      topN: 3,
      dryRun: false,
    } as any);
  }

  @Get('nilai/template')
  async downloadTemplate(
    @Req() req: any,
    @Query('jurusanId') jurusanId: string,
    @Query('semester') semester: string,
    @Query('multiSemester') multiSemester: string,
    @Query('mode') mode: string,
    @Query('semesterStart') semesterStart: string,
    @Query('semesterEnd') semesterEnd: string,
    @Res() res: Response,
  ) {
    const sekolah = await this.adminSekolahService.getApprovedSchoolOrFail(
      req.user.id,
    );

    const jenisSekolah = String(sekolah.jenis_sekolah || 'SMA').toUpperCase();
    const isSma = jenisSekolah === 'SMA';

    const isMultiSemester =
      String(multiSemester ?? '').toLowerCase() === 'true';

    let buffer: Buffer;
    let filename: string;

    if (isMultiSemester) {
      const idJurusan = Number(jurusanId ?? 0);

      if (!isSma && !idJurusan) {
        throw new BadRequestException(
          'Pilih jurusan SMK terlebih dahulu sebelum download template.',
        );
      }

      buffer = await this.nilaiSiswaService.getTemplateNilaiMultiSheet({
        sekolahId: sekolah.id_sekolah,
        jenisSekolah,
        mode: mode || (isSma ? 'sma_multi_jurusan' : 'smk_per_jurusan'),
        jurusanId: idJurusan || null,
        semesterStart: isSma ? Number(semesterStart || 1) : 1,
        semesterEnd: isSma ? Number(semesterEnd || 6) : 6,
      } as any);

      filename = isSma
        ? 'template_nilai_sma_multi_semester.xlsx'
        : `template_nilai_smk_jurusan_${idJurusan}_semester_1_6.xlsx`;
    } else {
      /**
       * Fallback mode lama.
       * Frontend baru tidak memakai mode ini, tapi tetap aman untuk kompatibilitas.
       */
      const semesterNumber = Number(semester ?? 0);
      const idJurusan = Number(jurusanId ?? 0);

      const isSemesterUmumSma =
        isSma && (semesterNumber === 1 || semesterNumber === 2);

      const isSemesterJurusanSma =
        isSma && [3, 4, 5, 6].includes(semesterNumber);

      if (isSma && ![1, 2, 3, 4, 5, 6].includes(semesterNumber)) {
        throw new BadRequestException(
          'Semester wajib dipilih untuk template SMA.',
        );
      }

      if (!isSma && !idJurusan) {
        throw new BadRequestException(
          'Jurusan wajib dipilih untuk template SMK.',
        );
      }

      if (isSemesterJurusanSma && !idJurusan) {
        throw new BadRequestException(
          'Jurusan wajib dipilih untuk template SMA semester 3 sampai 6.',
        );
      }

      buffer = await this.nilaiSiswaService.getTemplateNilaiByJurusan(
        isSemesterUmumSma ? null : idJurusan,
        {
          semester: isSma ? semesterNumber : null,
          jenisSekolah,
          sekolahId: sekolah.id_sekolah,
        },
      );

      filename = isSma
        ? isSemesterUmumSma
          ? `template_nilai_sma_semester_${semesterNumber}_umum.xlsx`
          : `template_nilai_sma_semester_${semesterNumber}_jurusan_${idJurusan}.xlsx`
        : `template_nilai_smk_jurusan_${idJurusan}.xlsx`;
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return res.send(buffer);
  }

  @Get('siswa/:id/nilai')
  getNilaiSiswa(@Param('id') id: string, @Req() req: any) {
    return this.adminSekolahService.getNilaiSiswa(Number(id), req.user.id);
  }
}