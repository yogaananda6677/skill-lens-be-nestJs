import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';
import { CreatePrestasiSiswaDto } from './dto/create-prestasi_siswa.dto';
import { UpdatePrestasiSiswaDto } from './dto/update-prestasi_siswa.dto';
import { PrestasiSiswaService } from './prestasi_siswa.service';

const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

@UseGuards(
  JwtAuthGuard,
  new RoleGuard(['siswa', 'guru', 'admin_sekolah', 'admin', 'superadmin']),
)
@Controller('prestasi-siswa')
export class PrestasiSiswaController {
  constructor(private readonly prestasiSiswaService: PrestasiSiswaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('bukti_file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Bukti prestasi harus berupa JPG, PNG, WEBP, atau PDF.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  create(
    @Req() req: any,
    @Body() dto: CreatePrestasiSiswaDto,
    @UploadedFile() file?: any,
  ) {
    return this.prestasiSiswaService.create(
      dto,
      req.user,
      file,
      this.getRequestBaseUrl(req),
    );
  }

  @Get()
  findAll(@Req() req: any, @Query('id_siswa') idSiswa?: string) {
    return this.prestasiSiswaService.findAll(req.user, Number(idSiswa || 0) || undefined);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prestasiSiswaService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrestasiSiswaDto,
  ) {
    return this.prestasiSiswaService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prestasiSiswaService.remove(id, req.user);
  }

  private getRequestBaseUrl(req: any) {
    const protocol = req.protocol || 'http';
    const host = req.get?.('host') || req.headers?.host || 'localhost:3000';
    return `${protocol}://${host}`;
  }
}
