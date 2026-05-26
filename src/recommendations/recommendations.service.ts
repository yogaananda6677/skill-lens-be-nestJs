import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { Siswa } from '../siswa/entities/siswa.entity';
import { RecommendationResult } from './entities/recommendation-result.entity';
import { RecommendationRun } from './entities/recommendation-run.entity';
import { SpkClientService } from './spk-client.service';

type NormalizedAlternative = {
  alternativeId: number | null;
  roadmapId: number | null;
  name: string;
  type: string | null;
  score: number;
  detail: any;
};

@Injectable()
export class RecommendationsService {
  private readonly engineVersion = 'spk-v10-controlled-tags-history';

  constructor(
    @InjectRepository(RecommendationRun)
    private readonly runRepo: Repository<RecommendationRun>,

    @InjectRepository(RecommendationResult)
    private readonly resultRepo: Repository<RecommendationResult>,

    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,

    private readonly spkClient: SpkClientService,
  ) {}

  async processAndSave(siswa: Siswa, payload: Record<string, any>) {
    const payloadHash = this.hashPayload(payload);
    const runCode = this.createRunCode(siswa.id_siswa);

    let result: any;
    try {
      result = await this.spkClient.requestRecommendation(payload);
    } catch (error: any) {
      await this.runRepo.save(
        this.runRepo.create({
          id_siswa: siswa.id_siswa,
          siswa,
          run_code: runCode,
          payload_hash: payloadHash,
          engine_version: this.engineVersion,
          tujuan_karir: String(payload.tujuan_karir ?? 'kuliah'),
          jenis_sekolah: String(payload.jenis_sekolah ?? ''),
          jurusan_sekolah: payload.jurusan_sekolah ?? null,
          payload,
          raw_response: null,
          status: 'failed',
          error_message: error?.message ?? 'SPK gagal diproses.',
        }),
      );
      throw error;
    }

    const alternatives = this.extractAlternatives(result);

    const run = await this.runRepo.manager.transaction(async (manager) => {
      /**
       * Selalu insert run baru. Tidak ada upsert berdasarkan id_siswa.
       * Dengan begitu histori rekomendasi siswa tetap aman.
       */
      const savedRun = await manager.save(
        RecommendationRun,
        manager.create(RecommendationRun, {
          id_siswa: siswa.id_siswa,
          siswa,
          run_code: runCode,
          payload_hash: payloadHash,
          engine_version: this.engineVersion,
          tujuan_karir: String(payload.tujuan_karir ?? 'kuliah'),
          jenis_sekolah: String(payload.jenis_sekolah ?? ''),
          jurusan_sekolah: payload.jurusan_sekolah ?? null,
          payload,
          raw_response: result,
          status: 'success',
          error_message: null,
        }),
      );

      let rank = 1;
      for (const item of alternatives) {
        await manager.save(
          RecommendationResult,
          manager.create(RecommendationResult, {
            id_recommendation_run: savedRun.id_recommendation_run,
            run: savedRun,
            rank_order: rank,
            alternative_id: item.alternativeId,
            roadmap_id: item.roadmapId,
            alternative_name: item.name,
            alternative_type: item.type,
            score: item.score,
            detail: item.detail,
          }),
        );
        rank += 1;
      }

      return savedRun;
    });

    const recommendations = alternatives.map((item, index) =>
      this.toFrontendRecommendation(item, index + 1),
    );

    return {
      id_recommendation_run: run.id_recommendation_run,
      run_code: run.run_code,
      raw: result,
      results: recommendations,
      recommendations,
    };
  }

  async getLatestBySiswa(idSiswa: number) {
    const latestRun = await this.runRepo.findOne({
      where: {
        id_siswa: idSiswa,
      } as any,
      order: {
        id_recommendation_run: 'DESC',
      } as any,
    });

    if (!latestRun) {
      return {
        message: 'Belum ada rekomendasi yang pernah diproses.',
        recommendations: [],
      };
    }

    const savedResults = await this.resultRepo.find({
      where: {
        id_recommendation_run: latestRun.id_recommendation_run,
      } as any,
      order: {
        rank_order: 'ASC',
      } as any,
    });

    let recommendations = savedResults.map((item) => ({
      id: item.id_recommendation_result ?? item.rank_order,
      alternatifId: item.alternative_id ?? item.detail?.alternatif_id ?? null,
      title: item.alternative_name,
      category: item.alternative_type ?? 'rekomendasi',
      score: Number(item.score ?? 0),
      summary:
        item.detail?.alasan ??
        item.detail?.summary ??
        item.detail?.deskripsi ??
        'Rekomendasi berdasarkan nilai akademik dan profil siswa.',
      dominantFactors: Array.isArray(item.detail?.tags_cocok)
        ? item.detail.tags_cocok
        : [],
      roadmapId: item.roadmap_id ?? this.resolveRoadmapId(item.detail),
      topsisRank: Number(item.rank_order ?? 1),
      detailScore: item.detail?.detail_skor ?? null,
      bobotDigunakan: item.detail?.bobot_digunakan ?? null,
    }));

    /**
     * Fallback khusus data lama yang belum punya recommendation_results.
     * Tetap tidak memakai fallback roadmapId dari alternative_id.
     */
    if (!recommendations.length) {
      const rawResponse = this.safeJson(latestRun.raw_response);
      const alternatives = this.extractAlternatives(rawResponse);
      recommendations = alternatives.map((item, index) =>
        this.toFrontendRecommendation(item, index + 1),
      );
    }

    return {
      message: 'Rekomendasi terakhir berhasil dimuat.',
      data: latestRun,
      recommendations,
    };
  }

  async getHistoryBySiswa(idSiswa: number, limit = 10) {
    const runs = await this.runRepo.find({
      where: { id_siswa: idSiswa } as any,
      order: { id_recommendation_run: 'DESC' } as any,
      take: Math.max(1, Math.min(Number(limit) || 10, 50)),
    });

    return {
      message: 'Histori rekomendasi berhasil dimuat.',
      data: runs,
    };
  }

  private extractAlternatives(result: any): NormalizedAlternative[] {
    const candidates =
      result?.top_rekomendasi ||
      result?.results ||
      result?.rekomendasi ||
      result?.data?.top_rekomendasi ||
      result?.data?.results ||
      result?.data?.rekomendasi ||
      result?.data ||
      result?.alternatives ||
      [];

    if (!Array.isArray(candidates)) return [];

    return candidates.map((item: any, index) => ({
      alternativeId: this.toNumberOrNull(
        item?.alternatif_id ?? item?.id_alternatif ?? item?.alternativeId ?? item?.id,
      ),
      roadmapId: this.resolveRoadmapId(item),
      name: String(
        item?.alternatif ||
          item?.nama ||
          item?.name ||
          item?.alternative_name ||
          item?.rekomendasi ||
          item?.label ||
          `Alternatif ${index + 1}`,
      ),
      type: item?.kategori || item?.type || item?.jenis || null,
      score: Number(
        item?.persentase_kecocokan ??
          item?.score ??
          item?.skor ??
          item?.nilai ??
          0,
      ),
      detail: item,
    }));
  }

  private resolveRoadmapId(detail: any) {
    /**
     * Penting: jangan fallback ke alternatif_id/id.
     * Roadmap hanya valid kalau engine mengirim roadmap_id/id_roadmap eksplisit.
     */
    return this.toNumberOrNull(
      detail?.roadmapId ??
        detail?.id_roadmap ??
        detail?.roadmap_id ??
        detail?.roadmap?.id_roadmap ??
        detail?.roadmap?.id,
    );
  }

  private toFrontendRecommendation(item: NormalizedAlternative, rank: number) {
    return {
      id: item.alternativeId ?? rank,
      alternatifId: item.alternativeId,
      title: item.name,
      category: item.type ?? 'rekomendasi',
      score: item.score,
      summary:
        item.detail?.alasan ??
        item.detail?.summary ??
        item.detail?.deskripsi ??
        'Rekomendasi berdasarkan nilai akademik dan profil siswa.',
      dominantFactors: Array.isArray(item.detail?.tags_cocok)
        ? item.detail.tags_cocok
        : [],
      roadmapId: item.roadmapId,
      topsisRank: Number(item.detail?.rank ?? rank),
      detailScore: item.detail?.detail_skor ?? null,
      bobotDigunakan: item.detail?.bobot_digunakan ?? null,
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private hashPayload(payload: Record<string, any>) {
    return createHash('sha256')
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest('hex');
  }

  private createRunCode(idSiswa: number) {
    return `SPK-${idSiswa}-${Date.now()}-${randomBytes(3).toString('hex')}`;
  }

  private safeJson(value: any) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      throw new BadRequestException('Raw response rekomendasi lama tidak valid.');
    }
  }
}
