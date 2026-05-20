import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Siswa } from '../siswa/entities/siswa.entity';
import { RecommendationResult } from './entities/recommendation-result.entity';
import { RecommendationRun } from './entities/recommendation-run.entity';
import { SpkClientService } from './spk-client.service';

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
      results: alternatives.map((item, index) => ({ rank: index + 1, ...item })),
    };
  }

  private extractAlternatives(result: any): Array<{ name: string; type: string | null; score: number; detail: any }> {
    const candidates =
      result?.results ||
      result?.rekomendasi ||
      result?.data ||
      result?.alternatives ||
      [];

    if (!Array.isArray(candidates)) return [];

    return candidates.map((item: any, index) => ({
      name: String(
        item?.nama ||
          item?.name ||
          item?.alternative_name ||
          item?.rekomendasi ||
          item?.label ||
          `Alternatif ${index + 1}`,
      ),
      type: item?.type || item?.jenis || item?.kategori || null,
      score: Number(item?.score ?? item?.skor ?? item?.nilai ?? 0),
      detail: item,
    }));
  }
}
