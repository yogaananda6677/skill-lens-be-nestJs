import {
  DEFAULT_SEMESTER_WEIGHTS,
  EXACT_SUBJECT_CATEGORY_MAP,
  IDENTITY_HEADER_KEYS,
  IGNORED_SUBJECT_KEYS,
  KEYWORD_SUBJECT_CATEGORY_RULES,
  NILAI_AKADEMIK_CATEGORIES,
} from '../constants/academic-categories';
import type { AcademicCategory } from '../constants/academic-categories';

export interface SubjectCategoryResult {
  mapel: string;
  key: string;
  kategori: AcademicCategory;
  source: 'exact' | 'keyword' | 'fallback';
  matchedBy?: string;
}

export interface SubjectColumnMeta extends SubjectCategoryResult {
  columnIndex: number;
  header: string;
}

export interface SemesterWeightParseResult {
  weights: Record<number, number>;
  warnings: string[];
}

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[’']/g, '')
    .replace(/[()\[\]{}.,:;|/\\_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeSubjectKey(value: unknown): string {
  return normalizeText(value)
    .replace(/^nilai\s+/, '')
    .replace(/^mapel\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isIdentityHeader(header: unknown): boolean {
  const key = normalizeSubjectKey(header);
  return IDENTITY_HEADER_KEYS.has(key);
}

export function isIgnoredSubjectHeader(header: unknown): boolean {
  const key = normalizeSubjectKey(header);
  return !key || IGNORED_SUBJECT_KEYS.has(key);
}

export function classifySubject(rawSubject: string): SubjectCategoryResult {
  const key = normalizeSubjectKey(rawSubject);

  if (EXACT_SUBJECT_CATEGORY_MAP[key]) {
    return {
      mapel: rawSubject.trim(),
      key,
      kategori: EXACT_SUBJECT_CATEGORY_MAP[key],
      source: 'exact',
      matchedBy: key,
    };
  }

  for (const rule of KEYWORD_SUBJECT_CATEGORY_RULES) {
    const matchedKeyword = rule.keywords.find((keyword) =>
      key.includes(normalizeSubjectKey(keyword)),
    );
    if (matchedKeyword) {
      return {
        mapel: rawSubject.trim(),
        key,
        kategori: rule.category,
        source: 'keyword',
        matchedBy: matchedKeyword,
      };
    }
  }

  return {
    mapel: rawSubject.trim(),
    key,
    kategori: 'softskill',
    source: 'fallback',
    matchedBy: 'default_softskill',
  };
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value))
    return clampScore(value);

  const normalized = String(value)
    .replace(/%/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.\-]/g, '')
    .trim();

  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return clampScore(parsed);
}

export function clampScore(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function roundScore(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function parseSemesterNumber(
  sheetName: string,
  fallbackIndex: number,
): number | null {
  const match = sheetName.match(/semester\s*(\d+)/i);
  if (match) {
    const sem = parseInt(match[1], 10);
    if (sem >= 1 && sem <= 6) return sem; // dari 5 menjadi 6
  }
  const num = parseInt(sheetName, 10);
  if (!isNaN(num) && num >= 1 && num <= 6) return num;
  return null;
}

export function parseSemesterWeights(
  input?: string | Record<string, number> | null,
): SemesterWeightParseResult {
  const warnings: string[] = [];
  const weights: Record<number, number> = { ...DEFAULT_SEMESTER_WEIGHTS };

  if (!input) return { weights, warnings };

  let parsed: unknown = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    try {
      parsed = trimmed.startsWith('{')
        ? JSON.parse(trimmed)
        : trimmed.split(',').map((item) => Number(item.trim()));
    } catch {
      warnings.push(
        'Format bobot semester tidak valid. Sistem memakai bobot default semester 1-5.',
      );
      return { weights, warnings };
    }
  }

  if (Array.isArray(parsed)) {
    parsed.forEach((weight, index) => {
      const numericWeight = Number(weight);
      if (Number.isFinite(numericWeight) && numericWeight > 0)
        weights[index + 1] = numericWeight;
    });
    return { weights, warnings };
  }

  if (typeof parsed === 'object' && parsed !== null) {
    Object.entries(parsed as Record<string, unknown>).forEach(
      ([semesterKey, weight]) => {
        const match = normalizeSubjectKey(semesterKey).match(/(\d+)/);
        const semester = match ? Number(match[1]) : Number(semesterKey);
        const numericWeight = Number(weight);

        if (
          Number.isFinite(semester) &&
          semester >= 1 &&
          Number.isFinite(numericWeight) &&
          numericWeight > 0
        ) {
          weights[semester] = numericWeight;
        }
      },
    );
    return { weights, warnings };
  }

  warnings.push(
    'Format bobot semester tidak dikenali. Sistem memakai bobot default semester 1-5.',
  );
  return { weights, warnings };
}

export function buildSubjectColumns(headerRow: unknown[]): SubjectColumnMeta[] {
  return headerRow
    .map((cell, columnIndex) => ({ cell, columnIndex }))
    .filter(
      ({ cell }) => !isIdentityHeader(cell) && !isIgnoredSubjectHeader(cell),
    )
    .map(({ cell, columnIndex }) => {
      const header = String(cell ?? '').trim();
      const category = classifySubject(header);
      return {
        ...category,
        columnIndex,
        header,
      };
    });
}

export function emptyAcademicScores(
  defaultValue = 0,
): Record<AcademicCategory, number> {
  return NILAI_AKADEMIK_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = defaultValue;
      return acc;
    },
    {} as Record<AcademicCategory, number>,
  );
}
