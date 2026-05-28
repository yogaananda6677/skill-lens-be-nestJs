import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export type SpkRecommendationItem = {
  rank?: number;
  ranking?: number;
  peringkat?: number;

  id?: number | null;
  alternatif_id?: number | null;
  alternatifId?: number | null;
  id_alternatif?: number | null;

  roadmap_id?: number | null;
  roadmapId?: number | null;
  id_roadmap?: number | null;
  roadmap?: {
    id?: number | null;
    id_roadmap?: number | null;
  } | null;

  alternatif?: string;
  title?: string;
  nama?: string;
  nama_rekomendasi?: string;
  nama_alternatif?: string;
  nama_jurusan?: string;
  nama_profesi?: string;
  judul?: string;
  label?: string;

  kategori?: string | null;
  category?: string | null;
  tipe?: string | null;
  jenis?: string | null;
  type?: string | null;

  deskripsi?: string | null;
  description?: string | null;
  summary?: string | null;
  keterangan?: string | null;

  score?: number;
  topsis_score?: number;
  nilai?: number;
  skor?: number;
  total_score?: number;
  final_score?: number;
  preferensi?: number;
  nilai_preferensi?: number;
  persentase_kecocokan?: number;

  persentase_tag?: number | null;
  tag_percentage?: number | null;
  tagScore?: number | null;

  persentase_kategori?: number | null;
  category_percentage?: number | null;
  categoryScore?: number | null;

  tags_cocok?: string[];
  dominantFactors?: string[];
  faktor_dominan?: string[] | string;

  detail_skor?: Record<string, number>;
  detailScore?: Record<string, number>;
  detail_score?: Record<string, number>;

  bobot_digunakan?: Record<string, number>;
  bobotDigunakan?: Record<string, number>;
  used_weights?: Record<string, number>;

  alasan?: string[] | string;
};

type PolishedReasonItem = {
  alternatif_id?: number | null;
  alternatif: string;
  alasan: string;
};

type GeminiJsonResponse = {
  rekomendasi: PolishedReasonItem[];
};

@Injectable()
export class AiReasonPolisherService {
  private readonly logger = new Logger(AiReasonPolisherService.name);
  private readonly client: GoogleGenAI | null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    this.client = apiKey
      ? new GoogleGenAI({
          apiKey,
        })
      : null;
  }

  async polishTopRecommendationReasons(params: {
    tujuan_karir?: string | null;
    rekomendasi: SpkRecommendationItem[];
  }): Promise<SpkRecommendationItem[]> {
    const enabled = process.env.AI_REASONING_ENABLED === 'true';
    const provider = process.env.AI_PROVIDER || 'gemini';

    const topThree = Array.isArray(params.rekomendasi)
      ? params.rekomendasi.slice(0, 3)
      : [];

    if (
      !enabled ||
      provider !== 'gemini' ||
      !this.client ||
      topThree.length === 0
    ) {
      return params.rekomendasi;
    }

    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

      const aiInput = this.buildAiInput(params.tujuan_karir, topThree);

      const prompt = `
Kamu adalah penulis alasan rekomendasi jurusan, karier, dan roadmap untuk sistem SPK siswa SMA/SMK.

Konteks penting:
- Data ini adalah hasil perhitungan SPK, bukan hasil keputusan AI.
- Ranking 1 adalah rekomendasi paling kuat.
- Ranking 2 dan 3 tetap relevan, tetapi prioritasnya berada di bawah ranking 1.
- Tugasmu hanya memperbaiki dan memperjelas bahasa alasan rekomendasi.
- Jangan mengubah ranking, skor, nama rekomendasi, roadmap_id, atau data angka.
- Jangan menambah rekomendasi baru.
- Jangan membuat klaim mutlak seperti "pasti cocok", "paling sempurna", atau "dijamin sukses".
- Gunakan bahasa Indonesia yang natural, jelas, sopan, dan mudah dipahami siswa.
- Jangan gunakan markdown.
- Jangan gunakan backtick.
- Jangan menulis teks di luar JSON.

Gaya penulisan setiap alasan:
1. Kalimat pertama: jelaskan singkat bidang/jurusan/rekomendasi tersebut membahas apa.
2. Kalimat kedua: jelaskan kenapa rekomendasi itu cocok berdasarkan hasil SPK, tag cocok, minat, nilai, atau faktor dominan.
3. Kalimat ketiga: jelaskan posisi rankingnya.
   - Untuk ranking 1, tekankan bahwa ini menjadi pilihan utama karena skor/kecocokannya paling tinggi.
   - Untuk ranking 2, jelaskan bahwa ini masih relevan, tetapi sedikit di bawah pilihan utama.
   - Untuk ranking 3, jelaskan bahwa ini dapat menjadi alternatif tambahan.
4. Maksimal 3 kalimat per alasan.
5. Hindari kalimat terlalu umum seperti "profil Anda cocok dengan bidang ini" tanpa menjelaskan faktornya.

Kembalikan hanya JSON valid dengan format persis:
{
  "rekomendasi": [
    {
      "alternatif_id": 1,
      "alternatif": "Nama Alternatif",
      "alasan": "Alasan yang sudah diperbaiki."
    }
  ]
}

Data hasil SPK:
${JSON.stringify(aiInput, null, 2)}
`.trim();

      const response = await this.client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: Number(process.env.GEMINI_TEMPERATURE || 0.2),
          maxOutputTokens: Number(
            process.env.GEMINI_MAX_OUTPUT_TOKENS || 2048,
          ),
          responseMimeType: 'application/json',
        },
      });

      const content = response.text;

      if (!content) {
        return params.rekomendasi;
      }

      const parsed = this.safeParseGeminiJson(content);

      if (!parsed?.rekomendasi || !Array.isArray(parsed.rekomendasi)) {
        this.logger.warn(
          'Gemini tidak mengembalikan format JSON rekomendasi yang valid.',
        );

        return params.rekomendasi;
      }

      return this.mergeAiReasons(params.rekomendasi, parsed.rekomendasi);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Gagal memoles alasan rekomendasi dengan Gemini: ${message}`,
      );

      return params.rekomendasi;
    }
  }

  private buildAiInput(
    tujuanKarir: string | null | undefined,
    topThree: SpkRecommendationItem[],
  ) {
    const topScores = topThree.map((item) => this.extractScore(item));
    const bestScore = topScores.length ? Math.max(...topScores) : 0;

    return {
      tujuan_karir: tujuanKarir ?? null,

      instruksi_ranking:
        'Ranking sudah ditentukan oleh SPK. Ranking 1 adalah rekomendasi utama, ranking 2 dan 3 adalah alternatif berikutnya.',

      ringkasan_perbandingan: topThree.map((item, index) => {
        const score = this.extractScore(item);
        const gapFromBest = Number((bestScore - score).toFixed(2));

        return {
          ranking: this.extractRank(item, index),
          alternatif: this.extractTitle(item),
          skor: score,
          selisih_dari_top_1: gapFromBest,
          posisi:
            index === 0
              ? 'Rekomendasi utama dengan skor tertinggi.'
              : index === 1
                ? 'Rekomendasi kedua, masih relevan tetapi di bawah pilihan utama.'
                : 'Rekomendasi ketiga, sebagai alternatif tambahan.',
        };
      }),

      rekomendasi: topThree.map((item, index) => ({
        ranking: this.extractRank(item, index),

        alternatif_id: this.extractAlternativeId(item),
        roadmap_id: this.extractRoadmapId(item),

        alternatif: this.extractTitle(item),
        kategori: this.extractCategory(item),

        deskripsi_alternatif:
          item.deskripsi ??
          item.description ??
          item.summary ??
          item.keterangan ??
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

        tags_cocok: this.extractTags(item),

        detail_skor:
          item.detail_skor ??
          item.detailScore ??
          item.detail_score ??
          {},

        bobot_digunakan:
          item.bobot_digunakan ??
          item.bobotDigunakan ??
          item.used_weights ??
          {},

        alasan_mentah: this.extractReasonArray(item.alasan),
      })),
    };
  }

  private mergeAiReasons(
    originalRows: SpkRecommendationItem[],
    polishedRows: PolishedReasonItem[],
  ): SpkRecommendationItem[] {
    return originalRows.map((item, index) => {
      const itemAlternativeId = this.extractAlternativeId(item);
      const itemTitle = this.extractTitle(item);

      const polished =
        polishedRows.find((aiItem) => {
          if (
            itemAlternativeId != null &&
            aiItem.alternatif_id != null &&
            Number(itemAlternativeId) === Number(aiItem.alternatif_id)
          ) {
            return true;
          }

          return this.normalizeText(aiItem.alternatif) === this.normalizeText(itemTitle);
        }) ?? polishedRows[index];

      if (!polished?.alasan) {
        return item;
      }

      return {
        ...item,
        alasan: polished.alasan.trim(),
      };
    });
  }

  private safeParseGeminiJson(content: string): GeminiJsonResponse | null {
    try {
      return JSON.parse(content) as GeminiJsonResponse;
    } catch {
      const cleaned = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      try {
        return JSON.parse(cleaned) as GeminiJsonResponse;
      } catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace >= 0 && lastBrace > firstBrace) {
          const jsonOnly = cleaned.slice(firstBrace, lastBrace + 1);

          try {
            return JSON.parse(jsonOnly) as GeminiJsonResponse;
          } catch {
            return null;
          }
        }

        return null;
      }
    }
  }

  private extractRank(item: SpkRecommendationItem, index: number): number {
    return Number(
      item.rank ??
        item.ranking ??
        item.peringkat ??
        index + 1,
    );
  }

  private extractAlternativeId(item: SpkRecommendationItem): number | null {
    const value =
      item.alternatif_id ??
      item.alternatifId ??
      item.id_alternatif ??
      item.id ??
      null;

    if (value == null) {
      return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private extractRoadmapId(item: SpkRecommendationItem): number | null {
    const value =
      item.roadmap_id ??
      item.roadmapId ??
      item.id_roadmap ??
      item.roadmap?.id_roadmap ??
      item.roadmap?.id ??
      null;

    if (value == null) {
      return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private extractTitle(item: SpkRecommendationItem): string {
    return String(
      item.alternatif ??
        item.title ??
        item.nama ??
        item.nama_rekomendasi ??
        item.nama_alternatif ??
        item.nama_jurusan ??
        item.nama_profesi ??
        item.judul ??
        item.label ??
        'Rekomendasi',
    ).trim();
  }

  private extractCategory(item: SpkRecommendationItem): string | null {
    const value =
      item.kategori ??
      item.category ??
      item.tipe ??
      item.jenis ??
      item.type ??
      null;

    return value ? String(value).trim() : null;
  }

  private extractScore(item: SpkRecommendationItem): number {
    const value =
      item.persentase_kecocokan ??
      item.score ??
      item.topsis_score ??
      item.nilai ??
      item.skor ??
      item.total_score ??
      item.final_score ??
      item.preferensi ??
      item.nilai_preferensi ??
      0;

    const numberValue = Number(value);

    return Number.isFinite(numberValue)
      ? Number(numberValue.toFixed(2))
      : 0;
  }

  private extractTags(item: SpkRecommendationItem): string[] {
    if (Array.isArray(item.tags_cocok)) {
      return this.uniqueStringArray(item.tags_cocok);
    }

    if (Array.isArray(item.dominantFactors)) {
      return this.uniqueStringArray(item.dominantFactors);
    }

    if (Array.isArray(item.faktor_dominan)) {
      return this.uniqueStringArray(item.faktor_dominan);
    }

    if (typeof item.faktor_dominan === 'string') {
      return this.uniqueStringArray(
        item.faktor_dominan
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      );
    }

    return [];
  }

  private extractReasonArray(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);
    }

    return [String(value).trim()].filter(Boolean);
  }

  private uniqueStringArray(values: unknown[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      const text = String(value ?? '').trim();

      if (!text) {
        continue;
      }

      const key = this.normalizeText(text);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(text);
    }

    return result;
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }
}