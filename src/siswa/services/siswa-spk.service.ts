import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AiReasonPolisherService } from '../../ai/ai-reason-polisher.service';
import { RecommendationsService } from '../../recommendations/recommendations.service';
import { Siswa } from '../entities/siswa.entity';
import { SiswaProfileService } from './siswa-profile.service';

type RecommendationRow = Record<string, any>;

@Injectable()
export class SiswaSpkService {
  constructor(
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,

    private readonly siswaProfileService: SiswaProfileService,
    private readonly recommendationsService: RecommendationsService,
    private readonly aiReasonPolisherService: AiReasonPolisherService,
  ) {}

  async prosesSpk(userId: number, body: any) {
    /**
     * 1. Update profil dulu agar data terbaru dari form langsung dipakai.
     */
    await this.siswaProfileService.updateProfil(userId, body);

    /**
     * 2. Ambil profil siswa lengkap.
     */
    const siswaDto = await this.siswaProfileService.getMe(userId);

    const siswaEntity = await this.siswaRepo.findOne({
      where: { id_siswa: siswaDto.id_siswa },
      relations: ['sekolah'],
    });

    if (!siswaEntity) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    const nilaiAkademik = siswaDto.nilai_akademik ?? {};

    if (!nilaiAkademik || Object.keys(nilaiAkademik).length === 0) {
      throw new BadRequestException(
        'Nilai akademik siswa belum tersedia. Hubungi guru untuk memproses data nilai.',
      );
    }

    /**
     * 3. Susun payload untuk Python SPK.
     * Tag sudah mapped_key dari database, jadi tidak perlu normalisasi alias lagi.
     */
    const tujuanKarir = this.normalizeTujuanKarir(
      body?.tujuan_karir ?? siswaDto.tujuan ?? 'kuliah',
    );

    const payload = {
      id_siswa: siswaDto.id_siswa,
      nisn: siswaDto.nisn,
      nama: siswaDto.nama,
      kelas: siswaDto.kelas,
      jurusan: siswaDto.jurusan,

      jenis_sekolah:
        (siswaEntity.sekolah as any)?.jenis_sekolah ??
        (siswaDto.sekolah as any)?.jenis_sekolah ??
        'SMA',

      jurusan_sekolah: siswaDto.jurusan,
      top_n: this.normalizeTopN(body?.top_n ?? 3),

      ...nilaiAkademik,

      minat: this.uniqueStringArray(siswaDto.minat),
      hobi: this.uniqueStringArray(siswaDto.hobi),
      bakat: this.uniqueStringArray(siswaDto.bakat),
      pengalaman: this.uniqueStringArray(siswaDto.pengalaman),

      prestasi: Array.isArray((siswaDto as any).prestasi_spk)
        ? (siswaDto as any).prestasi_spk
        : [],

      prestasi_detail: Array.isArray((siswaDto as any).prestasi)
        ? (siswaDto as any).prestasi
        : [],

      tujuan_karir: tujuanKarir,
    };

    /**
     * 4. Proses dan simpan rekomendasi sebagai histori baru.
     * Catatan:
     * - Kalau RecommendationsService sudah menyimpan ke DB di dalam processAndSave,
     *   maka alasan AI di sini dipakai untuk response frontend.
     * - Kalau kamu ingin alasan AI ikut tersimpan ke DB, nanti bagian polishing
     *   perlu dipindah ke dalam RecommendationsService sebelum insert result.
     */
    const recommendation = await this.recommendationsService.processAndSave(
      siswaEntity,
      payload,
    );

    /**
     * 5. Ambil baris rekomendasi asli dari response Python / hasil save.
     */
    const rawRows = this.findRecommendationRows(recommendation);

    /**
     * 6. Siapkan top rekomendasi untuk AI.
     * AI hanya memperbaiki bahasa field alasan, bukan menghitung ulang skor.
     */
    const rowsForAi = this.prepareRowsForAi(rawRows);

    const polishedRowsForAi =
      await this.aiReasonPolisherService.polishTopRecommendationReasons({
        tujuan_karir: tujuanKarir,
        rekomendasi: rowsForAi,
      });

    /**
     * 7. Merge kembali alasan AI ke row asli.
     * Field lain tetap dari Python SPK.
     */
    const finalRows = this.mergePolishedReasons(rawRows, polishedRowsForAi);

    /**
     * 8. Tempelkan kembali rows yang sudah dipoles ke response.
     */
    const finalRecommendation = this.attachRecommendationRows(
      recommendation,
      finalRows,
    );

    const recommendations = this.normalizeRecommendations(finalRecommendation);

    return {
      message: recommendations.length
        ? 'Rekomendasi berhasil diproses. Alasan rekomendasi telah disusun ulang agar lebih mudah dipahami.'
        : 'SPK diproses, tetapi hasil rekomendasi kosong.',

      id_recommendation_run: recommendation.id_recommendation_run,
      run_code: recommendation.run_code,

      payload,
      data: finalRecommendation,
      recommendations,
    };
  }

  async getLatestSpk(userId: number) {
    const siswaDto = await this.siswaProfileService.getMe(userId);
    return this.recommendationsService.getLatestBySiswa(siswaDto.id_siswa);
  }

  private prepareRowsForAi(rows: RecommendationRow[]) {
    return rows.slice(0, 3).map((item, index) => ({
      ...item,

      ranking: Number(
        item.ranking ?? item.peringkat ?? item.rank ?? item.topsisRank ?? index + 1,
      ),

      alternatif_id:
        item.alternatif_id ??
        item.alternatifId ??
        item.id_alternatif ??
        item.id ??
        null,

      roadmap_id:
        item.roadmap_id ??
        item.id_roadmap ??
        item.roadmapId ??
        item.roadmap?.id_roadmap ??
        item.roadmap?.id ??
        null,

      alternatif: this.extractTitle(item),

      kategori:
        item.kategori ??
        item.category ??
        item.tipe ??
        item.jenis ??
        item.type ??
        null,

      persentase_kecocokan: this.extractScore(item),

      persentase_tag:
        item.persentase_tag ??
        item.tag_percentage ??
        item.tagScore ??
        null,

      persentase_kategori:
        item.persentase_kategori ??
        item.category_percentage ??
        item.categoryScore ??
        null,

      tags_cocok: this.extractDominantFactors(item),

      detail_skor:
        item.detail_skor ??
        item.detailScore ??
        item.detail_score ??
        null,

      bobot_digunakan:
        item.bobot_digunakan ??
        item.bobotDigunakan ??
        item.used_weights ??
        null,

      alasan: item.alasan ?? item.summary ?? item.deskripsi ?? item.description ?? '',
    }));
  }

  private mergePolishedReasons(
    originalRows: RecommendationRow[],
    polishedRows: RecommendationRow[],
  ) {
    if (!Array.isArray(originalRows) || originalRows.length === 0) {
      return [];
    }

    if (!Array.isArray(polishedRows) || polishedRows.length === 0) {
      return originalRows;
    }

    return originalRows.map((original, index) => {
      const originalAltId =
        original.alternatif_id ??
        original.alternatifId ??
        original.id_alternatif ??
        original.id ??
        null;

      const originalTitle = this.extractTitle(original);

      const polished =
        polishedRows.find((item) => {
          const itemAltId =
            item.alternatif_id ??
            item.alternatifId ??
            item.id_alternatif ??
            item.id ??
            null;

          if (
            originalAltId != null &&
            itemAltId != null &&
            Number(originalAltId) === Number(itemAltId)
          ) {
            return true;
          }

          return this.extractTitle(item) === originalTitle;
        }) ?? polishedRows[index];

      const polishedReason = this.extractReasonText(polished?.alasan);

      if (!polishedReason) {
        return original;
      }

      return {
        ...original,
        alasan: polishedReason,
      };
    });
  }

  private attachRecommendationRows(result: any, rows: RecommendationRow[]) {
    if (!result || typeof result !== 'object') {
      return {
        top_rekomendasi: rows,
      };
    }

    if (Array.isArray(result)) {
      return rows;
    }

    if (result?.raw && Array.isArray(result.raw.top_rekomendasi)) {
      return {
        ...result,
        raw: {
          ...result.raw,
          top_rekomendasi: rows,
        },
      };
    }

    if (Array.isArray(result.top_rekomendasi)) {
      return {
        ...result,
        top_rekomendasi: rows,
      };
    }

    if (result?.data && Array.isArray(result.data.top_rekomendasi)) {
      return {
        ...result,
        data: {
          ...result.data,
          top_rekomendasi: rows,
        },
      };
    }

    if (Array.isArray(result.recommendations)) {
      return {
        ...result,
        recommendations: rows,
      };
    }

    if (Array.isArray(result.rekomendasi)) {
      return {
        ...result,
        rekomendasi: rows,
      };
    }

    if (Array.isArray(result.hasil_rekomendasi)) {
      return {
        ...result,
        hasil_rekomendasi: rows,
      };
    }

    return {
      ...result,
      top_rekomendasi: rows,
    };
  }

  private normalizeRecommendations(result: any) {
    const raw = this.findRecommendationRows(result);
    const rows = Array.isArray(raw) ? raw : [];

    return rows.map((item: any, index: number) => {
      const alasanText = this.extractReasonText(
        item.alasan ??
          item.summary ??
          item.deskripsi ??
          item.keterangan ??
          item.description,
      );

      return {
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

        title: this.extractTitle(item),

        category:
          item.category ??
          item.kategori ??
          item.tipe ??
          item.jenis ??
          item.type ??
          'rekomendasi',

        score: this.extractScore(item),

        summary:
          alasanText ||
          'Rekomendasi berdasarkan nilai akademik dan profil siswa.',

        alasan:
          alasanText ||
          'Rekomendasi berdasarkan nilai akademik dan profil siswa.',

        dominantFactors: this.extractDominantFactors(item),

        detailScore: item.detail_skor ?? item.detailScore ?? null,
        bobotDigunakan: item.bobot_digunakan ?? item.bobotDigunakan ?? null,

        persentaseTag:
          item.persentase_tag ??
          item.tag_percentage ??
          item.tagScore ??
          null,

        persentaseKategori:
          item.persentase_kategori ??
          item.category_percentage ??
          item.categoryScore ??
          null,

        /**
         * Roadmap tidak boleh fallback ke alternatif_id.
         * Roadmap hanya valid kalau engine mengirim roadmap_id/id_roadmap.
         */
        roadmapId:
          item.roadmapId ??
          item.id_roadmap ??
          item.roadmap_id ??
          item.roadmap?.id_roadmap ??
          item.roadmap?.id ??
          null,

        topsisRank: Number(
          item.topsisRank ??
            item.rank ??
            item.peringkat ??
            item.ranking ??
            index + 1,
        ),

        raw: item,
      };
    });
  }

  private findRecommendationRows(value: any): any[] {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.length ? value : [];
    }

    if (typeof value !== 'object') {
      return [];
    }

    if (
      Array.isArray(value?.raw?.top_rekomendasi) &&
      value.raw.top_rekomendasi.length
    ) {
      return value.raw.top_rekomendasi;
    }

    if (
      Array.isArray(value?.top_rekomendasi) &&
      value.top_rekomendasi.length
    ) {
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

  private extractTitle(item: any): string {
    return (
      item?.title ??
      item?.nama ??
      item?.nama_rekomendasi ??
      item?.nama_alternatif ??
      item?.alternatif ??
      item?.nama_jurusan ??
      item?.nama_profesi ??
      item?.judul ??
      item?.label ??
      'Rekomendasi'
    );
  }

  private extractScore(item: any): number {
    return Number(
      item?.score ??
        item?.topsis_score ??
        item?.nilai ??
        item?.skor ??
        item?.total_score ??
        item?.final_score ??
        item?.preferensi ??
        item?.nilai_preferensi ??
        item?.persentase_kecocokan ??
        0,
    );
  }

  private extractDominantFactors(item: any): string[] {
    if (Array.isArray(item?.dominantFactors)) {
      return item.dominantFactors;
    }

    if (Array.isArray(item?.faktor_dominan)) {
      return item.faktor_dominan;
    }

    if (Array.isArray(item?.tags_cocok)) {
      return item.tags_cocok;
    }

    if (typeof item?.faktor_dominan === 'string') {
      return item.faktor_dominan
        .split(',')
        .map((value: string) => value.trim())
        .filter(Boolean);
    }

    return [];
  }

  private extractReasonText(value: any): string {
    if (!value) return '';

    if (Array.isArray(value)) {
      return value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .join(' ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value).trim();
  }

  private uniqueStringArray(value: any): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const result: string[] = [];
    const seen = new Set<string>();

    for (const item of value) {
      const text = String(item ?? '').trim();

      if (!text || seen.has(text)) {
        continue;
      }

      seen.add(text);
      result.push(text);
    }

    return result;
  }

  private normalizeTopN(value: any): number {
    const topN = Number(value);

    if (!Number.isFinite(topN)) {
      return 3;
    }

    return Math.min(Math.max(Math.floor(topN), 1), 10);
  }

  private normalizeTujuanKarir(value: any): string {
    const text = String(value ?? '').trim().toLowerCase();

    if (['kuliah', 'kerja', 'wirausaha', 'umum'].includes(text)) {
      return text;
    }

    return 'kuliah';
  }
}