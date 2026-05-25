type OptionalNumberInput = number | string | null | undefined;
type OptionalBooleanInput = boolean | string | number | null | undefined;

export interface ImportNilaiExcelDto {
  sekolahId?: OptionalNumberInput;
  jurusanId?: OptionalNumberInput;
  jurusan?: string | null;

  semester?: OptionalNumberInput;

  jenisSekolah?: string | null;
  tujuanKarir?: string | null;
  topN?: OptionalNumberInput;
  dryRun?: OptionalBooleanInput;
  tahunAjaran?: string | null;
  semesterWeights?: string | Record<number, number> | null;
}

export interface ImportNilaiExcelOptions {
  sekolahId?: number | null;
  jurusanId?: number | null;
  jurusan?: string;

  semester?: number | null;

  jenisSekolah: string;
  tujuanKarir: string;
  topN: number;
  dryRun: boolean;
  tahunAjaran: string;
  semesterWeights?: string | Record<number, number>;
}

export function normalizeImportNilaiOptions(
  dto: ImportNilaiExcelDto = {},
): ImportNilaiExcelOptions {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  const topN = toOptionalNumber(dto.topN);

  return {
    sekolahId: toOptionalNumber(dto.sekolahId),
    jurusanId: toOptionalNumber(dto.jurusanId),

    jurusan: cleanOptionalString(dto.jurusan),

    semester: toOptionalNumber(dto.semester),

    tahunAjaran:
      cleanOptionalString(dto.tahunAjaran) || `${currentYear}/${nextYear}`,

    jenisSekolah:
      cleanOptionalString(dto.jenisSekolah)?.toUpperCase() || 'SMA',

    tujuanKarir:
      cleanOptionalString(dto.tujuanKarir) || 'kuliah',

    topN: topN && topN > 0 ? topN : 3,

    dryRun: parseBoolean(dto.dryRun),

    semesterWeights: dto.semesterWeights ?? undefined,
  };
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function cleanOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const cleaned = String(value).trim();

  return cleaned || undefined;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return false;
  }

  return ['true', '1', 'yes', 'ya', 'y'].includes(
    String(value).trim().toLowerCase(),
  );
}