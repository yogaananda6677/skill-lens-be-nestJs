import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RecommendationsService } from '../../recommendations/recommendations.service';
import { Siswa } from '../entities/siswa.entity';
import { SiswaProfileService } from './siswa-profile.service';

@Injectable()
export class SiswaSpkService {
  constructor(
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,
    private readonly siswaProfileService: SiswaProfileService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async prosesSpk(userId: number, body: any) {
    await this.siswaProfileService.updateProfil(userId, body);
    const siswaDto = await this.siswaProfileService.getMe(userId);

    const siswaEntity = await this.siswaRepo.findOne({
      where: { id_siswa: siswaDto.id_siswa },
      relations: ['sekolah'],
    });

    if (!siswaEntity) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    if (
      !siswaDto.nilai_akademik ||
      Object.keys(siswaDto.nilai_akademik).length === 0
    ) {
      throw new BadRequestException(
        'Nilai akademik siswa belum tersedia. Hubungi guru untuk memproses data nilai.',
      );
    }

    const payload = {
      id_siswa: siswaDto.id_siswa,
      nisn: siswaDto.nisn,
      nama: siswaDto.nama,
      kelas: siswaDto.kelas,
      jurusan: siswaDto.jurusan,
      jenis_sekolah: (siswaDto.sekolah as any)?.jenis_sekolah ?? 'SMA',
      jurusan_sekolah: siswaDto.jurusan,
      top_n: Number(body?.top_n ?? 3),
      ...siswaDto.nilai_akademik,
      minat: siswaDto.minat,
      hobi: siswaDto.hobi,
      bakat: siswaDto.bakat,
      pengalaman: siswaDto.pengalaman,
      prestasi: siswaDto.prestasi,
      tujuan_karir: siswaDto.tujuan || body?.tujuan_karir || 'kuliah',
    };

        const recommendation = await this.recommendationsService.processAndSave(
        siswaEntity,
        payload,
        );

        const recommendations = Array.isArray(recommendation)
        ? recommendation
        : Array.isArray((recommendation as any)?.recommendations)
            ? (recommendation as any).recommendations
            : Array.isArray((recommendation as any)?.data)
            ? (recommendation as any).data
            : [];

        return {
        message: 'Rekomendasi berhasil diproses dan disimpan.',
        payload,
        data: recommendation,
        recommendations,
        };
  }
}
