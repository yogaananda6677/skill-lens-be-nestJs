import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Siswa } from '../siswa/entities/siswa.entity';
import { RecommendationResult } from './entities/recommendation-result.entity';
import { RecommendationRun } from './entities/recommendation-run.entity';
import { SpkClientService } from './spk-client.service';

type NormalizedAlternative = {
  name: string;
  type: string | null;
  score: number;
  detail: any;
};

@Injectable()
export class RecommendationsService {
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
    const result = await this.spkClient.requestRecommendation(payload);

    const run = await this.runRepo.save(
      this.runRepo.create({
        id_siswa: siswa.id_siswa,
        siswa,
        tujuan_karir: String(payload.tujuan_karir ?? 'kuliah'),
        jenis_sekolah: String(payload.jenis_sekolah ?? ''),
        jurusan_sekolah: payload.jurusan_sekolah ?? null,
        payload,
        raw_response: result,
        status: 'success',
      }),
    );

    const alternatives = this.extractAlternatives(result);

    let rank = 1;

    for (const item of alternatives) {
      await this.resultRepo.save(
        this.resultRepo.create({
          id_recommendation_run: run.id_recommendation_run,
          run,
          rank_order: rank,
          alternative_name: item.name,
          alternative_type: item.type,
          score: item.score,
          detail: item.detail,
        }),
      );

      rank += 1;
    }

    return {
      id_recommendation_run: run.id_recommendation_run,
      raw: result,
      results: alternatives.map((item, index) =>
        this.toFrontendRecommendation(item, index + 1),
      ),
      recommendations: alternatives.map((item, index) =>
        this.toFrontendRecommendation(item, index + 1),
      ),
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
      alternatifId:
        item.detail?.alternatif_id ??
        item.detail?.id_alternatif ??
        item.detail?.id ??
        null,
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
      roadmapId: this.resolveRoadmapId(item.detail),
      topsisRank: Number(item.rank_order ?? 1),
      detailScore: item.detail?.detail_skor ?? null,
      bobotDigunakan: item.detail?.bobot_digunakan ?? null,
    }));

    /**
     * Fallback kalau data lama belum sempat masuk ke recommendation_result.
     * Ini membaca raw_response.top_rekomendasi.
     */
    if (!recommendations.length) {
      const rawResponse =
        typeof latestRun.raw_response === 'string'
          ? JSON.parse(latestRun.raw_response)
          : latestRun.raw_response;

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
    return (
      detail?.roadmapId ??
      detail?.id_roadmap ??
      detail?.roadmap_id ??
      detail?.roadmap?.id_roadmap ??
      detail?.roadmap?.id ??
      detail?.alternatif_id ??
      detail?.id_alternatif ??
      detail?.alternativeId ??
      detail?.id ??
      null
    );
  }

  private toFrontendRecommendation(item: NormalizedAlternative, rank: number) {
    return {
      id:
        item.detail?.alternatif_id ??
        item.detail?.id_alternatif ??
        item.detail?.id ??
        rank,

      alternatifId:
        item.detail?.alternatif_id ??
        item.detail?.id_alternatif ??
        item.detail?.id ??
        null,

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

      roadmapId: this.resolveRoadmapId(item.detail),

      topsisRank: Number(item.detail?.rank ?? rank),

      detailScore: item.detail?.detail_skor ?? null,
      bobotDigunakan: item.detail?.bobot_digunakan ?? null,
    };
  }
}