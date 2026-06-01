import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class SpkClientService {
  async requestRecommendation(payload: Record<string, any>) {
    const spkBaseUrl =
      process.env.SPK_API_URL ||
      process.env.PYTHON_API ||
      'http://127.0.0.1:8000';

    const spkUrl = `${spkBaseUrl.replace(/\/$/, '')}/rekomendasi`;
    const timeoutMs = Number(process.env.SPK_TIMEOUT_MS ?? 15000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(spkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new BadRequestException(
          result?.message || result?.detail || 'Gagal memproses rekomendasi dari layanan SPK.',
        );
      }

      return result;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new BadRequestException('Layanan SPK terlalu lama merespons.');
      }
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'Layanan SPK belum tersedia. Pastikan server Python berjalan dan endpoint /rekomendasi aktif.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
