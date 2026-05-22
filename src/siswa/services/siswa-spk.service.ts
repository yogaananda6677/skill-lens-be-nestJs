import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

      minat: siswaDto.minat ?? [],
      hobi: siswaDto.hobi ?? [],
      bakat: siswaDto.bakat ?? [],
      pengalaman: siswaDto.pengalaman ?? [],

      prestasi: Array.isArray((siswaDto as any).prestasi_spk)
        ? (siswaDto as any).prestasi_spk
        : Array.isArray(body?.prestasi)
          ? body.prestasi
          : [],

      prestasi_detail: Array.isArray((siswaDto as any).prestasi)
        ? (siswaDto as any).prestasi
        : Array.isArray(body?.prestasi_detail)
          ? body.prestasi_detail
          : [],

      tujuan_karir: siswaDto.tujuan || body?.tujuan_karir || 'kuliah',
    };

    const recommendation = await this.recommendationsService.processAndSave(
      siswaEntity,
      payload,
    );

    console.log(
      '[SPK RAW RESULT]',
      JSON.stringify(recommendation, null, 2),
    );

    const recommendations = this.normalizeRecommendations(recommendation);

    console.log(
      '[SPK NORMALIZED RESULT]',
      JSON.stringify(recommendations, null, 2),
    );

    return {
      message: recommendations.length
        ? 'Rekomendasi berhasil diproses dan disimpan.'
        : 'SPK diproses, tetapi hasil rekomendasi kosong.',
      payload,
      data: recommendation,
      recommendations,


      // sementara untuk debug frontend
      debug: {
        raw_type: Array.isArray(recommendation) ? 'array' : typeof recommendation,
        raw_keys:
          recommendation && typeof recommendation === 'object'
            ? Object.keys(recommendation)
            : [],
        normalized_count: recommendations.length,
      },
    };
  }

  async getLatestSpk(userId: number) {
  const siswaDto = await this.siswaProfileService.getMe(userId);

  return this.recommendationsService.getLatestBySiswa(siswaDto.id_siswa);
}

  private normalizeRecommendations(result: any) {
  const raw = this.findRecommendationRows(result);
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((item: any, index: number) => ({
    id:
      item.id ??
      item.id_rekomendasi ??
      item.id_recommendation ??
      item.id_alternatif ??
      item.alternatif_id ??
      item.id_jurusan ??
      item.id_profesi ??
      index + 1,

    alternatifId:
      item.alternatifId ??
      item.alternatif_id ??
      item.id_alternatif ??
      null,

    title:
      item.title ??
      item.nama ??
      item.nama_rekomendasi ??
      item.nama_alternatif ??
      item.alternatif ??
      item.nama_jurusan ??
      item.nama_profesi ??
      item.judul ??
      item.label ??
      'Rekomendasi',

    category:
      item.category ??
      item.kategori ??
      item.tipe ??
      item.jenis ??
      item.type ??
      'rekomendasi',

    score: Number(
      item.score ??
        item.topsis_score ??
        item.nilai ??
        item.skor ??
        item.total_score ??
        item.final_score ??
        item.preferensi ??
        item.nilai_preferensi ??
        item.persentase_kecocokan ??
        0,
    ),

    summary:
      item.summary ??
      item.deskripsi ??
      item.alasan ??
      item.keterangan ??
      item.description ??
      'Rekomendasi berdasarkan nilai akademik dan profil siswa.',

    dominantFactors: Array.isArray(item.dominantFactors)
      ? item.dominantFactors
      : Array.isArray(item.faktor_dominan)
        ? item.faktor_dominan
        : Array.isArray(item.tags_cocok)
          ? item.tags_cocok
          : typeof item.faktor_dominan === 'string'
            ? item.faktor_dominan
                .split(',')
                .map((value: string) => value.trim())
                .filter(Boolean)
            : [],

    detailScore: item.detail_skor ?? item.detailScore ?? null,
    bobotDigunakan: item.bobot_digunakan ?? item.bobotDigunakan ?? null,

    roadmapId:
      item.roadmapId ??
      item.id_roadmap ??
      item.roadmap_id ??
      item.roadmap?.id_roadmap ??
      item.roadmap?.id ??
      item.alternatif_id ??
      item.id_alternatif ??
      item.alternatifId ??
      item.id ??
      null,

    topsisRank: Number(
      item.topsisRank ??
        item.rank ??
        item.peringkat ??
        item.ranking ??
        index + 1,
    ),
  }));
}

private findRecommendationRows(value: any): any[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.length ? value : [];
  }

  if (typeof value !== 'object') {
    return [];
  }

  /**
   * Kasus backend kamu:
   * recommendation.raw.top_rekomendasi
   */
  if (Array.isArray(value?.raw?.top_rekomendasi) && value.raw.top_rekomendasi.length) {
    return value.raw.top_rekomendasi;
  }

  if (Array.isArray(value?.top_rekomendasi) && value.top_rekomendasi.length) {
    return value.top_rekomendasi;
  }

  const directKeys = [
    'top_rekomendasi',
    'recommendations',
    'rekomendasi',
    'hasil_rekomendasi',
    'hasil',
    'ranked',
    'ranking',
    'results',
    'items',
    'rows',
    'data',
    'alternatives',
    'alternatif',
  ];

  for (const key of directKeys) {
    const current = value[key];

    /**
     * Jangan return array kosong.
     * Kalau kosong, lanjut cari field lain.
     */
    if (Array.isArray(current)) {
      if (current.length) return current;
      continue;
    }

    if (current && typeof current === 'object') {
      const nested = this.findRecommendationRows(current);
      if (nested.length) return nested;
    }
  }

  for (const current of Object.values(value)) {
    if (Array.isArray(current)) {
      if (current.length) return current;
      continue;
    }

    if (current && typeof current === 'object') {
      const nested = this.findRecommendationRows(current);
      if (nested.length) return nested;
    }
  }

  return [];
}
}