import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { RoadmapMaster, RoadmapTargetType } from '../roadmap_master/entities/roadmap_master.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { StudentRoadmap } from '../roadmaps/entities/student-roadmap.entity';
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

    @InjectRepository(RoadmapMaster)
    private readonly roadmapRepo: Repository<RoadmapMaster>,

    @InjectRepository(StudentRoadmap)
    private readonly studentRoadmapRepo: Repository<StudentRoadmap>,

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

    const alternatives = await this.extractAlternatives(result, payload.tujuan_karir);

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

  async updateResultDetailsWithRows(
    idRecommendationRun: number,
    rows: Array<Record<string, any>>,
  ) {
    if (!idRecommendationRun || !Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const savedResults = await this.resultRepo.find({
      where: { id_recommendation_run: idRecommendationRun } as any,
      order: { rank_order: 'ASC' } as any,
    });

    if (!savedResults.length) return;

    for (const result of savedResults) {
      const matched = this.findMatchingRowForResult(result, rows);
      if (!matched) continue;

      const roadmapId =
        this.resolveRoadmapId(matched) ??
        this.toNumberOrNull(matched.roadmapId) ??
        result.roadmap_id;
      const polishedReason = this.extractSummaryFromDetail(matched);
      const mergedDetail = {
        ...(result.detail && typeof result.detail === 'object' ? result.detail : {}),
        ...matched,
      };

      if (polishedReason) {
        mergedDetail.alasan = polishedReason;
        mergedDetail.summary = polishedReason;
        mergedDetail.alasan_ai = polishedReason;
      }

      if (roadmapId) {
        result.roadmap_id = roadmapId;
        mergedDetail.roadmapId = roadmapId;
        mergedDetail.roadmap_id = mergedDetail.roadmap_id ?? roadmapId;
        mergedDetail.id_roadmap = mergedDetail.id_roadmap ?? roadmapId;
      }

      result.detail = mergedDetail;
      await this.resultRepo.save(result);
    }
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

    let recommendations: any[] = [];

    for (const item of savedResults) {
      const roadmapId =
        item.roadmap_id ??
        (await this.resolveRoadmapIdFromDatabase({
          explicitRoadmapId: this.resolveRoadmapId(item.detail),
          alternativeId: item.alternative_id ?? item.detail?.alternatif_id ?? item.detail?.id_alternatif ?? null,
          name: item.alternative_name,
          targetType: item.detail?.tujuan_karir ?? item.detail?.target_type ?? latestRun.tujuan_karir,
        }));

      recommendations.push({
        id: item.id_recommendation_result ?? item.rank_order,
        alternatifId: item.alternative_id ?? item.detail?.alternatif_id ?? null,
        title: item.alternative_name,
        category: item.alternative_type ?? latestRun.tujuan_karir ?? 'rekomendasi',
        score: Number(item.score ?? 0),
        summary: this.extractSummaryFromDetail(item.detail),
        dominantFactors: this.extractDominantFactorsFromDetail(item.detail),
        roadmapId,
        topsisRank: Number(item.rank_order ?? 1),
        detailScore: item.detail?.detail_skor ?? null,
        bobotDigunakan: item.detail?.bobot_digunakan ?? null,
      });
    }

    /**
     * Fallback khusus data lama yang belum punya recommendation_results.
     * Tetap tidak memakai fallback roadmapId dari alternative_id.
     */
    if (!recommendations.length) {
      const rawResponse = this.safeJson(latestRun.raw_response);
      const alternatives = await this.extractAlternatives(rawResponse, latestRun.tujuan_karir);
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

  async getHistoryBySiswa(idSiswa: number, limit = 8) {
    const runs = await this.runRepo.find({
      where: { id_siswa: idSiswa, status: 'success' } as any,
      order: { id_recommendation_run: 'DESC' } as any,
      take: Math.max(1, Math.min(Number(limit) || 8, 30)),
    });

    if (!runs.length) {
      return {
        message: 'Belum ada histori generate SPK.',
        data: [],
      };
    }

    const roadmapRows = await this.studentRoadmapRepo.find({
      where: { id_siswa: idSiswa } as any,
      relations: ['roadmap'],
      order: { id_student_roadmap: 'DESC' } as any,
    });

    const data = [] as any[];

    for (let index = 0; index < runs.length; index += 1) {
      const run = runs[index];
      const newerRun = index > 0 ? runs[index - 1] : null;
      const results = await this.resultRepo.find({
        where: { id_recommendation_run: run.id_recommendation_run } as any,
        order: { rank_order: 'ASC' } as any,
      });

      const recommendations = [] as any[];

      for (const item of results) {
        const roadmapId =
          item.roadmap_id ??
          (await this.resolveRoadmapIdFromDatabase({
            explicitRoadmapId: this.resolveRoadmapId(item.detail),
            alternativeId:
              item.alternative_id ??
              item.detail?.alternatif_id ??
              item.detail?.id_alternatif ??
              null,
            name: item.alternative_name,
            targetType:
              item.detail?.tujuan_karir ?? item.detail?.target_type ?? run.tujuan_karir,
          }));

        recommendations.push({
          id: item.id_recommendation_result ?? item.rank_order,
          alternativeId: item.alternative_id ?? item.detail?.alternatif_id ?? null,
          alternatifId: item.alternative_id ?? item.detail?.alternatif_id ?? null,
          roadmapId,
          title: item.alternative_name,
          category: item.alternative_type ?? run.tujuan_karir ?? 'rekomendasi',
          score: Number(item.score ?? 0),
          summary: this.extractSummaryFromDetail(item.detail),
          dominantFactors: this.extractDominantFactorsFromDetail(item.detail),
          topsisRank: Number(item.rank_order ?? 1),
        });
      }

      const selectedRoadmap = this.findSelectedRoadmapForRun({
        run,
        newerRun,
        recommendations,
        roadmapRows,
      });

      data.push({
        id: run.id_recommendation_run,
        id_recommendation_run: run.id_recommendation_run,
        runCode: run.run_code,
        run_code: run.run_code,
        tujuanKarir: run.tujuan_karir,
        tujuan_karir: run.tujuan_karir,
        jenisSekolah: run.jenis_sekolah,
        jenis_sekolah: run.jenis_sekolah,
        jurusanSekolah: run.jurusan_sekolah,
        jurusan_sekolah: run.jurusan_sekolah,
        createdAt: run.created_at,
        created_at: run.created_at,
        selected: selectedRoadmap,
        selectedRoadmap,
        recommendations,
      });
    }

    return {
      message: 'Histori generate SPK berhasil dimuat.',
      data,
    };
  }

  private findMatchingRowForResult(
    result: RecommendationResult,
    rows: Array<Record<string, any>>,
  ) {
    const resultAltId = this.toNumberOrNull(
      result.alternative_id ?? result.detail?.alternatif_id ?? result.detail?.id_alternatif,
    );
    const resultTitle = this.normalizeText(result.alternative_name);

    return (
      rows.find((row) => {
        const rowAltId = this.toNumberOrNull(
          row?.alternativeId ??
            row?.alternatifId ??
            row?.alternatif_id ??
            row?.id_alternatif ??
            row?.id,
        );

        if (resultAltId && rowAltId && resultAltId === rowAltId) return true;

        const rowTitle = this.normalizeText(
          row?.title ??
            row?.alternatif ??
            row?.nama ??
            row?.alternative_name ??
            row?.nama_rekomendasi,
        );

        return Boolean(resultTitle && rowTitle && resultTitle === rowTitle);
      }) ?? rows[(result.rank_order ?? 1) - 1]
    );
  }

  private extractSummaryFromDetail(detail: any) {
    const value =
      detail?.alasan_ai ??
      detail?.ai_reason ??
      detail?.alasanPolished ??
      detail?.alasan_polished ??
      detail?.alasan ??
      detail?.summary ??
      detail?.deskripsi ??
      detail?.description ??
      detail?.keterangan ??
      'Rekomendasi berdasarkan nilai akademik dan profil siswa.';

    if (Array.isArray(value)) {
      return value.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ');
    }

    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value ?? '').trim();
  }

  private extractDominantFactorsFromDetail(detail: any): string[] {
    const value =
      detail?.dominantFactors ??
      detail?.faktor_dominan ??
      detail?.tags_cocok ??
      detail?.matched_tags ??
      [];

    if (Array.isArray(value)) {
      return value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, 8);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8);
    }

    return [];
  }

  private findSelectedRoadmapForRun({
    run,
    newerRun,
    recommendations,
    roadmapRows,
  }: {
    run: RecommendationRun;
    newerRun: RecommendationRun | null;
    recommendations: any[];
    roadmapRows: StudentRoadmap[];
  }) {
    const runCreatedAt = new Date(run.created_at).getTime();
    const newerRunCreatedAt = newerRun ? new Date(newerRun.created_at).getTime() : Number.POSITIVE_INFINITY;
    const recommendationRoadmapIds = new Set(
      recommendations
        .map((item) => this.toNumberOrNull(item.roadmapId))
        .filter((value): value is number => Boolean(value)),
    );

    if (!recommendationRoadmapIds.size) return null;

    const selected = roadmapRows.find((row) => {
      const createdAt = new Date(row.created_at).getTime();
      return (
        recommendationRoadmapIds.has(row.id_roadmap) &&
        createdAt >= runCreatedAt &&
        createdAt < newerRunCreatedAt
      );
    });

    if (!selected) return null;

    return {
      id: selected.id_student_roadmap,
      id_student_roadmap: selected.id_student_roadmap,
      roadmapId: selected.id_roadmap,
      id_roadmap: selected.id_roadmap,
      title: selected.roadmap?.recommended_for ?? selected.roadmap?.title ?? 'Roadmap dipilih',
      roadmapTitle: selected.roadmap?.title ?? null,
      category: selected.roadmap?.category ?? selected.roadmap?.target_type ?? null,
      status: selected.status,
      selectedAt: selected.created_at,
      selected_at: selected.created_at,
    };
  }

  private async extractAlternatives(
    result: any,
    defaultTargetType?: unknown,
  ): Promise<NormalizedAlternative[]> {
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

    const rows: NormalizedAlternative[] = [];

    for (const item of candidates) {
      const index = rows.length;
      const alternativeId = this.toNumberOrNull(
        item?.alternatif_id ?? item?.id_alternatif ?? item?.alternativeId ?? item?.id,
      );
      const name = String(
        item?.alternatif ||
          item?.nama ||
          item?.name ||
          item?.alternative_name ||
          item?.rekomendasi ||
          item?.label ||
          `Alternatif ${index + 1}`,
      );
      const targetType =
        item?.tujuan_karir ??
        item?.target_type ??
        item?.jalur ??
        defaultTargetType ??
        item?.jenis ??
        item?.type ??
        item?.kategori ??
        null;
      const type =
        item?.kategori ??
        item?.category ??
        item?.tipe ??
        item?.jenis ??
        this.normalizeTargetType(targetType) ??
        null;
      const roadmapId = await this.resolveRoadmapIdFromDatabase({
        explicitRoadmapId: this.resolveRoadmapId(item),
        alternativeId,
        name,
        targetType,
      });

      if (roadmapId) {
        item.roadmap_id = item.roadmap_id ?? roadmapId;
        item.id_roadmap = item.id_roadmap ?? roadmapId;
        item.roadmapId = item.roadmapId ?? roadmapId;
      }

      rows.push({
        alternativeId,
        roadmapId,
        name,
        type,
        score: Number(
          item?.persentase_kecocokan ??
            item?.score ??
            item?.skor ??
            item?.nilai ??
            0,
        ),
        detail: item,
      });
    }

    return rows;
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

  private async resolveRoadmapIdFromDatabase({
    explicitRoadmapId,
    alternativeId,
    name,
    targetType,
  }: {
    explicitRoadmapId?: number | null;
    alternativeId?: number | null;
    name?: string | null;
    targetType?: unknown;
  }) {
    if (explicitRoadmapId) return explicitRoadmapId;

    const normalizedName = this.normalizeText(name);
    const normalizedTargetType = this.normalizeTargetType(targetType);

    if (normalizedName) {
      const exactWhere: any = {
        recommended_for: name,
        is_active: 1,
      };

      if (normalizedTargetType) {
        exactWhere.target_type = normalizedTargetType;
      }

      const exact = await this.roadmapRepo.findOne({ where: exactWhere });
      if (exact) return exact.id_roadmap;
    }

    if (alternativeId) {
      const byId = await this.roadmapRepo.findOne({
        where: { id_roadmap: alternativeId, is_active: 1 },
      });

      if (
        byId &&
        (!normalizedTargetType || byId.target_type === normalizedTargetType) &&
        (!normalizedName || this.normalizeText(byId.recommended_for) === normalizedName)
      ) {
        return byId.id_roadmap;
      }
    }

    if (!normalizedName) return null;

    const candidates = await this.roadmapRepo.find({
      where: normalizedTargetType
        ? ({ target_type: normalizedTargetType, is_active: 1 } as any)
        : ({ is_active: 1 } as any),
    });

    const match = candidates.find(
      (roadmap) => this.normalizeText(roadmap.recommended_for) === normalizedName,
    );

    return match?.id_roadmap ?? null;
  }

  private normalizeTargetType(value: unknown): RoadmapTargetType | null {
    const text = this.normalizeText(value);
    if (text === 'kuliah') return 'kuliah';
    if (text === 'kerja') return 'kerja';
    if (text === 'wirausaha') return 'wirausaha';
    if (text === 'umum') return 'umum';
    return null;
  }

  private normalizeText(value: unknown) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private toFrontendRecommendation(item: NormalizedAlternative, rank: number) {
    return {
      id: item.alternativeId ?? rank,
      alternatifId: item.alternativeId,
      title: item.name,
      category: item.type ?? 'rekomendasi',
      score: item.score,
      summary: this.extractSummaryFromDetail(item.detail),
      dominantFactors: this.extractDominantFactorsFromDetail(item.detail),
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
