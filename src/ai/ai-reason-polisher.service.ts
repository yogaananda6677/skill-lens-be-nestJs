import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export type SpkRecommendationItem = {
  alternatif_id?: number | null;
  roadmap_id?: number | null;
  alternatif: string;
  kategori?: string | null;
  persentase_kecocokan?: number;
  persentase_tag?: number;
  persentase_kategori?: number;
  tags_cocok?: string[];
  detail_skor?: Record<string, number>;
  bobot_digunakan?: Record<string, number>;
  alasan?: string[] | string;
};

type PolishedReasonItem = {
  alternatif_id?: number | null;
  alternatif: string;
  alasan: string;
};

type GrokJsonResponse = {
  ringkasan_umum?: string;
  rekomendasi: PolishedReasonItem[];
};

@Injectable()
export class AiReasonPolisherService {
  private readonly logger = new Logger(AiReasonPolisherService.name);
  private readonly client: OpenAI | null;

  constructor() {
    const apiKey = process.env.XAI_API_KEY;
    const baseURL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL,
          timeout: Number(process.env.XAI_TIMEOUT_MS || 30000),
        })
      : null;
  }

  async polishTopRecommendationReasons(params: {
    tujuan_karir?: string | null;
    rekomendasi: SpkRecommendationItem[];
  }): Promise<SpkRecommendationItem[]> {
    const enabled = process.env.AI_REASONING_ENABLED === 'true';

    const topThree = params.rekomendasi.slice(0, 3);

    if (!enabled || !this.client || topThree.length === 0) {
      return params.rekomendasi;
    }

    try {
      const model = process.env.XAI_MODEL || 'grok-4.3';

      const aiInput = {
        tujuan_karir: params.tujuan_karir ?? null,
        rekomendasi: topThree.map((item, index) => ({
          ranking: index + 1,
          alternatif_id: item.alternatif_id ?? null,
          roadmap_id: item.roadmap_id ?? null,
          alternatif: item.alternatif,
          kategori: item.kategori ?? null,
          persentase_kecocokan: item.persentase_kecocokan ?? null,
          persentase_tag: item.persentase_tag ?? null,
          persentase_kategori: item.persentase_kategori ?? null,
          tags_cocok: item.tags_cocok ?? [],
          detail_skor: item.detail_skor ?? {},
          bobot_digunakan: item.bobot_digunakan ?? {},
          alasan_mentah: Array.isArray(item.alasan)
            ? item.alasan
            : item.alasan
              ? [item.alasan]
              : [],
        })),
      };

      const response = await this.client.chat.completions.create({
        model,
        temperature: Number(process.env.XAI_TEMPERATURE || 0.25),
        max_tokens: Number(process.env.XAI_MAX_TOKENS || 1200),
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'Kamu adalah penulis alasan rekomendasi karier untuk sistem SPK siswa SMA/SMK.',
              'Tugasmu hanya memperbaiki bahasa alasan dari data SPK.',
              'Jangan mengubah ranking.',
              'Jangan mengubah skor.',
              'Jangan menambah rekomendasi baru.',
              'Jangan menghapus nama alternatif.',
              'Jangan membuat klaim mutlak seperti pasti cocok atau pasti sukses.',
              'Gunakan bahasa Indonesia yang natural, jelas, sopan, dan mudah dipahami.',
              'Setiap alasan maksimal 3 sampai 4 kalimat.',
              'Kembalikan hanya JSON valid dengan format:',
              '{"rekomendasi":[{"alternatif_id":number|null,"alternatif":"string","alasan":"string"}]}',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify(aiInput),
          },
        ],
      });

      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        return params.rekomendasi;
      }

      const parsed = JSON.parse(content) as GrokJsonResponse;

      if (!parsed.rekomendasi || !Array.isArray(parsed.rekomendasi)) {
        return params.rekomendasi;
      }

      return params.rekomendasi.map((item) => {
        const polished = parsed.rekomendasi.find((aiItem) => {
          if (
            item.alternatif_id != null &&
            aiItem.alternatif_id != null &&
            Number(item.alternatif_id) === Number(aiItem.alternatif_id)
          ) {
            return true;
          }

          return aiItem.alternatif === item.alternatif;
        });

        if (!polished?.alasan) {
          return item;
        }

        return {
          ...item,
          alasan: polished.alasan,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Gagal memoles alasan rekomendasi dengan AI: ${message}`);

      return params.rekomendasi;
    }
  }
}