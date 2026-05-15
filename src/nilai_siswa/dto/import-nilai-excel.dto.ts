export interface ImportNilaiExcelDto {
  sekolahId?: number | string;
  jurusanId?: number | string;
  tahunAjaran?: string;
  jurusan?: string;
  jenisSekolah?: string;
  tujuanKarir?: string;
  topN?: number | string;
  dryRun?: boolean | string;
  semesterWeights?: string;
}

export interface ImportNilaiExcelOptions {
  sekolahId?: number;
  jurusanId?: number;
  tahunAjaran: string;
  jurusan?: string;
  jenisSekolah: string;
  tujuanKarir: string;
  topN: number;
  dryRun: boolean;
  semesterWeights?: string;
}

export function normalizeImportNilaiOptions(dto: ImportNilaiExcelDto = {}): ImportNilaiExcelOptions {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  return {
    sekolahId: toOptionalNumber(dto.sekolahId),
    jurusanId: toOptionalNumber(dto.jurusanId),
    tahunAjaran: dto.tahunAjaran || `${currentYear}/${nextYear}`,
    jurusan: dto.jurusan,
    jenisSekolah: dto.jenisSekolah || 'SMA',
    tujuanKarir: dto.tujuanKarir || 'kuliah',
    topN: toOptionalNumber(dto.topN) || 3,
    dryRun: parseBoolean(dto.dryRun),
    semesterWeights: dto.semesterWeights,
  };
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  return ['true', '1', 'yes', 'ya'].includes(String(value).toLowerCase());
}
