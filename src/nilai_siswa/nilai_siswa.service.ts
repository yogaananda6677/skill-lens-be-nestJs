import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';

import { User } from '../user/entities/user.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { Semester } from '../semester/entities/semester.entity';
import { MataPelajaran } from '../mata_pelajaran/entities/mata_pelajaran.entity';
import { KurikulumMapel } from '../kurikulum_mapel/entities/kurikulum_mapel.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { NilaiSiswa } from './entities/nilai_siswa.entity';
import { NilaiKategoriSiswa } from './entities/nilai_kategori_siswa.entity';
import { normalizeImportNilaiOptions } from './dto/import-nilai-excel.dto';
import type {
  ImportNilaiExcelDto,
  ImportNilaiExcelOptions,
} from './dto/import-nilai-excel.dto';
import { NILAI_AKADEMIK_CATEGORIES } from './constants/academic-categories';
import type { AcademicCategory } from './constants/academic-categories';
import {
  buildSubjectColumns,
  classifySubject,
  emptyAcademicScores,
  normalizeSubjectKey,
  parseSemesterNumber,
  parseSemesterWeights,
  roundScore,
  toNumber,
} from './utils/academic-excel-mapper';
import type {
  SubjectCategoryResult,
  SubjectColumnMeta,
} from './utils/academic-excel-mapper';

interface ParsedGrade {
  semester: number;
  sheetName: string;
  mapel: string;
  mapelKey: string;
  kategori: AcademicCategory;
  nilai: number;
}

interface CategoryBucket {
  sum: number;
  count: number;
  mapel: Set<string>;
}

interface StudentAccumulator {
  nisn: string;
  nama: string;
  jk?: string;
  kelas?: string;
  jurusan?: string;
  rawGrades: ParsedGrade[];
  semesters: Record<number, Record<AcademicCategory, CategoryBucket>>;
}

interface ParsedWorkbookResult {
  students: StudentAccumulator[];
  subjectMappings: SubjectCategoryResult[];
  semesters: number[];
  totalGrades: number;
  warnings: string[];
}

export interface FinalCategoryDetail {
  semester: number;
  bobot: number;
  rata_rata: number;
  jumlah_mapel: number;
  mapel: string[];
}

export interface StudentAcademicResult {
  nisn: string;
  nama: string;
  jk?: string;
  kelas?: string;
  jurusan?: string;
  id_siswa?: number;
  akun?: {
    username: string;
    password_default: string;
    akun_baru: boolean;
    perlu_ganti_password: boolean;
  };
  nilai_akademik: Record<AcademicCategory, number>;
  rincian_per_kategori: Record<AcademicCategory, FinalCategoryDetail[]>;
  rincian_per_semester: Record<
    number,
    Record<
      AcademicCategory,
      { rata_rata: number | null; jumlah_mapel: number; mapel: string[] }
    >
  >;
  payload_spk: Record<string, unknown>;
}

export interface ImportDatabaseStats {
  siswa_dibuat: number;
  siswa_diupdate: number;
  mapel_dibuat: number;
  mapel_diupdate: number;
  kurikulum_mapel_dibuat: number;
  nilai_siswa_dibuat: number;
  nilai_siswa_diupdate: number;
  nilai_kategori_dibuat: number;
  nilai_kategori_diupdate: number;
}

export interface ImportNilaiExcelResponse {
  status: 'success';
  message: string;
  meta: {
    mode: 'dry_run' | 'import_and_generate';
    jumlah_siswa: number;
    jumlah_nilai: number;
    semester_terbaca: number[];
    jumlah_mapel_terdeteksi: number;
    jumlah_mapel_fallback: number;
    kategori_akademik: readonly AcademicCategory[];
    urutan_penyimpanan: string[];
    database?: ImportDatabaseStats;
  };
  bobot_semester: Record<number, number>;
  mapping_mapel: SubjectCategoryResult[];
  warnings: string[];
  data: StudentAcademicResult[];
}

export interface MappingMapelResponse {
  kategori_akademik: readonly AcademicCategory[];
  bobot_semester_default: Record<number, number>;
  contoh_mapping: SubjectCategoryResult[];
  aturan: {
    identitas_siswa: string[];
    sheet_semester: string[];
    alur_import_database: string[];
    catatan: string;
  };
}

export interface ProfilAkademikResponse {
  id_siswa: number;
  nisn: string;
  nama: string;
  kelas: string;
  jurusan: string;
  nilai_akademik: Record<AcademicCategory, number>;
  rincian_per_kategori: Record<string, unknown>;
  payload_spk: Record<string, unknown>;
}

interface PersistedImportResult {
  results: StudentAcademicResult[];
  stats: ImportDatabaseStats;
}

@Injectable()
export class NilaiSiswaService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(NilaiKategoriSiswa)
    private readonly kategoriRepo: Repository<NilaiKategoriSiswa>,
  ) {}

  async importExcel(
    file: any,
    dto: ImportNilaiExcelDto = {},
  ): Promise<ImportNilaiExcelResponse> {
    if (!file?.buffer) {
      throw new BadRequestException(
        'File Excel belum dikirim. Gunakan field multipart bernama file.',
      );
    }

    const options = normalizeImportNilaiOptions(dto);
    if (options.jurusanId && !options.jurusan) {
      const jurusan = await this.dataSource.getRepository(Jurusan).findOne({
        where: { id_jurusan: options.jurusanId },
      });

      if (!jurusan) {
        throw new BadRequestException('Jurusan yang dipilih tidak ditemukan.');
      }

      if (options.sekolahId && jurusan.id_sekolah !== options.sekolahId) {
        throw new BadRequestException(
          'Jurusan tidak sesuai dengan sekolah yang dipilih.',
        );
      }

      options.jurusan = jurusan.nama_jurusan;
    }
    const { weights: semesterWeights, warnings: weightWarnings } =
      parseSemesterWeights(options.semesterWeights);
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: false,
    });

    const parsed = this.parseWorkbook(workbook, semesterWeights, options);
    const fallbackSubjects = parsed.subjectMappings.filter(
      (mapping) => mapping.source === 'fallback',
    );
    const warnings = [
      ...weightWarnings,
      ...parsed.warnings,
      ...(fallbackSubjects.length
        ? [
            `Ada ${fallbackSubjects.length} mapel yang belum punya mapping spesifik dan sementara dimasukkan ke softskill: ${fallbackSubjects
              .map((item) => item.mapel)
              .join(', ')}`,
          ]
        : []),
    ];

    let results = parsed.students.map((student) =>
      this.buildStudentAcademicResult(student, semesterWeights, options),
    );
    let databaseStats: ImportDatabaseStats | undefined;

    if (!options.dryRun) {
      const persisted = await this.persistImportResults(
        parsed.students,
        results,
        options,
      );
      results = persisted.results;
      databaseStats = persisted.stats;
    }

    return {
      status: 'success',
      message: options.dryRun
        ? 'File berhasil dibaca. Dry run aktif, data belum disimpan ke database.'
        : 'Import nilai berhasil. Data siswa, mapel, kurikulum, nilai mentah, dan nilai kategori akademik sudah diproses.',
      meta: {
        mode: options.dryRun ? 'dry_run' : 'import_and_generate',
        jumlah_siswa: results.length,
        jumlah_nilai: parsed.totalGrades,
        semester_terbaca: parsed.semesters.sort((a, b) => a - b),
        jumlah_mapel_terdeteksi: parsed.subjectMappings.length,
        jumlah_mapel_fallback: fallbackSubjects.length,
        kategori_akademik: NILAI_AKADEMIK_CATEGORIES,
        urutan_penyimpanan: [
          '1. Upsert user dan siswa berdasarkan NISN',
          '2. Upsert mata_pelajaran beserta kategori akademik',
          '3. Upsert semester dan kurikulum_mapel per sekolah/jurusan/semester/mapel',
          '4. Upsert nilai_siswa sebagai nilai mentah per siswa dan kurikulum_mapel',
          '5. Generate/upsert nilai_kategori_siswa berisi 8 kategori akademik per id_siswa',
        ],
        ...(databaseStats ? { database: databaseStats } : {}),
      },
      bobot_semester: semesterWeights,
      mapping_mapel: parsed.subjectMappings,
      warnings,
      data: results,
    };
  }

  async getProfilAkademik(idSiswa: number): Promise<ProfilAkademikResponse> {
    const rows = await this.kategoriRepo.find({
      where: { id_siswa: idSiswa },
      relations: ['siswa', 'siswa.user'],
      order: { kategori: 'ASC' },
    });

    if (!rows.length) {
      throw new NotFoundException(
        'Profil akademik siswa belum ada. Import nilai terlebih dahulu.',
      );
    }

    const nilaiAkademik = emptyAcademicScores();
    const rincian: Record<string, unknown> = {};

    rows.forEach((row) => {
      nilaiAkademik[row.kategori] = row.nilai;
      rincian[row.kategori] = row.rincian_semester || [];
    });

    const siswa = rows[0].siswa;
    return {
      id_siswa: siswa.id_siswa,
      nisn: siswa.nisn,
      nama: siswa.user?.nama || '',
      kelas: siswa.kelas,
      jurusan: siswa.jurusan,
      nilai_akademik: nilaiAkademik,
      rincian_per_kategori: rincian,
      payload_spk: {
        id_siswa: siswa.id_siswa,
        nama: siswa.user?.nama || '',
        tujuan_karir: 'kuliah',
        jenis_sekolah: 'SMA',
        jurusan_sekolah: siswa.jurusan || '',
        top_n: 3,
        ...nilaiAkademik,
        minat: [],
        bakat: [],
        hobi: [],
        pengalaman: [],
        prestasi: '',
      },
    };
  }

  getMappingMapel(): MappingMapelResponse {
    const examples = [
      'Matematika',
      'Bahasa Indonesia',
      'Bahasa Inggris',
      'Fisika',
      'Kimia',
      'Biologi',
      'Sejarah',
      'Ekonomi',
      'Informatika',
      'Pendidikan Agama Islam',
      'Seni Budaya',
      'PJOK',
      'P5',
      'Produk Kreatif dan Kewirausahaan',
    ];

    return {
      kategori_akademik: NILAI_AKADEMIK_CATEGORIES,
      bobot_semester_default: parseSemesterWeights().weights,
      contoh_mapping: examples.map((mapel) => classifySubject(mapel)),
      aturan: {
        identitas_siswa: ['No', 'NISN', 'Nama', 'JK', 'Kelas', 'Jurusan'],
        sheet_semester: [
          'Semester 1',
          'Semester 2',
          'Semester 3',
          'Semester 4',
          'Semester 5',
        ],
        alur_import_database: [
          'Data siswa dibuat/diperbarui lebih dulu berdasarkan NISN.',
          'Mata pelajaran dari setiap sheet semester disimpan ke tabel mata_pelajaran.',
          'Relasi mapel dengan sekolah, jurusan, dan semester disimpan ke tabel kurikulum_mapel.',
          'Nilai mentah setiap siswa disimpan ke tabel nilai_siswa.',
          'Nilai mentah diolah menjadi 8 nilai kategori akademik dan disimpan ke tabel nilai_kategori_siswa dengan id_siswa.',
        ],
        catatan:
          'Kolom setelah identitas dianggap mata pelajaran. Mapel boleh berbeda per semester. Setiap mapel dipetakan dulu ke kategori akademik, dirata-ratakan per kategori per semester, lalu diagregasi memakai bobot semester.',
      },
    };
  }

  private parseWorkbook(
    workbook: XLSX.WorkBook,
    semesterWeights: Record<number, number>,
    options: ImportNilaiExcelOptions,
  ): ParsedWorkbookResult {
    const students = new Map<string, StudentAccumulator>();
    const subjectMappingsByKey = new Map<string, SubjectCategoryResult>();
    const semesters = new Set<number>();
    const warnings: string[] = [];
    let totalGrades = 0;

    const candidateSheets = workbook.SheetNames.filter((sheetName) => {
      const key = normalizeSubjectKey(sheetName);
      return ![
        'panduan',
        'mapping mapel',
        'bobot semester',
        'ringkasan akademik',
        'ringkasan',
      ].includes(key);
    });

    candidateSheets.forEach((sheetName, sheetIndex) => {
      const semester = parseSemesterNumber(sheetName, sheetIndex);
      if (!semester || semester > 6) return;

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: null,
        raw: true,
        blankrows: false,
      });

      if (!rows.length) return;

      const headerRowIndex = this.findHeaderRowIndex(rows);
      if (headerRowIndex < 0) {
        warnings.push(
          `Sheet ${sheetName} dilewati karena tidak ditemukan header NISN dan Nama.`,
        );
        return;
      }

      const headerRow = rows[headerRowIndex];
      const columns = this.resolveIdentityColumns(headerRow);
      const subjectColumns = buildSubjectColumns(headerRow);

      if (columns.nisn < 0 || columns.nama < 0) {
        warnings.push(
          `Sheet ${sheetName} dilewati karena kolom NISN atau Nama tidak lengkap.`,
        );
        return;
      }

      if (!subjectColumns.length) {
        warnings.push(
          `Sheet ${sheetName} tidak memiliki kolom mata pelajaran.`,
        );
        return;
      }

      subjectColumns.forEach((subject) => {
        subjectMappingsByKey.set(subject.key, {
          mapel: subject.mapel,
          key: subject.key,
          kategori: subject.kategori,
          source: subject.source,
          matchedBy: subject.matchedBy,
        });
      });

      semesters.add(semester);
      const bobot = semesterWeights[semester] ?? 1;

      rows.slice(headerRowIndex + 1).forEach((row) => {
        const nisn = this.readCell(row, columns.nisn);
        const nama = this.readCell(row, columns.nama);
        if (!nisn || !nama) return;

        const student = this.getOrCreateAccumulator(students, nisn, nama, {
          jk: columns.jk >= 0 ? this.readCell(row, columns.jk) : undefined,
          kelas:
            columns.kelas >= 0 ? this.readCell(row, columns.kelas) : undefined,
          jurusan: options.jurusan,
        });

        subjectColumns.forEach((subjectColumn) => {
          const nilai = toNumber(row[subjectColumn.columnIndex]);
          if (nilai === null) return;

          this.pushGrade(student, semester, sheetName, subjectColumn, nilai);
          totalGrades += 1;
        });
      });

      if (!bobot)
        warnings.push(
          `Bobot semester ${semester} kosong. Sistem memakai bobot 1.`,
        );
    });

    if (!students.size) {
      throw new BadRequestException(
        'Tidak ada data siswa yang dapat dibaca dari file Excel. Pastikan header NISN dan Nama tersedia.',
      );
    }

    return {
      students: Array.from(students.values()),
      subjectMappings: Array.from(subjectMappingsByKey.values()).sort((a, b) =>
        a.mapel.localeCompare(b.mapel),
      ),
      semesters: Array.from(semesters.values()),
      totalGrades,
      warnings,
    };
  }

  private findHeaderRowIndex(rows: unknown[][]): number {
    return rows.findIndex((row) => {
      const keys = row.map((cell) => normalizeSubjectKey(cell));
      const hasNisn = keys.includes('nisn') || keys.includes('nis');
      const hasNama = keys.includes('nama') || keys.includes('nama siswa');
      return hasNisn && hasNama;
    });
  }

  private resolveIdentityColumns(headerRow: unknown[]): {
    nisn: number;
    nama: number;
    jk: number;
    kelas: number;
    jurusan: number;
  } {
    const keys = headerRow.map((cell) => normalizeSubjectKey(cell));
    return {
      nisn: this.findColumn(keys, ['nisn', 'nis']),
      nama: this.findColumn(keys, ['nama', 'nama siswa']),
      jk: this.findColumn(keys, ['jk', 'jenis kelamin']),
      kelas: this.findColumn(keys, ['kelas']),
      jurusan: this.findColumn(keys, [
        'jurusan',
        'program keahlian',
        'kompetensi keahlian',
      ]),
    };
  }

  private findColumn(keys: string[], aliases: string[]): number {
    return keys.findIndex((key) => aliases.includes(key));
  }

  private readCell(row: unknown[], index: number): string {
    if (index < 0) return '';
    return String(row[index] ?? '').trim();
  }

  private getOrCreateAccumulator(
    students: Map<string, StudentAccumulator>,
    nisn: string,
    nama: string,
    extra: { jk?: string; kelas?: string; jurusan?: string },
  ): StudentAccumulator {
    const key = nisn.trim();
    let student = students.get(key);

    if (!student) {
      student = {
        nisn: key,
        nama: nama.trim(),
        jk: extra.jk,
        kelas: extra.kelas,
        jurusan: extra.jurusan,
        rawGrades: [],
        semesters: {},
      };
      students.set(key, student);
    }

    student.nama = student.nama || nama.trim();
    student.jk = student.jk || extra.jk;
    student.kelas = student.kelas || extra.kelas;
    student.jurusan = student.jurusan || extra.jurusan;

    return student;
  }

  private pushGrade(
    student: StudentAccumulator,
    semester: number,
    sheetName: string,
    subject: SubjectColumnMeta,
    nilai: number,
  ): void {
    if (!student.semesters[semester])
      student.semesters[semester] = this.createEmptyBuckets();

    const bucket = student.semesters[semester][subject.kategori];
    bucket.sum += nilai;
    bucket.count += 1;
    bucket.mapel.add(subject.mapel);

    student.rawGrades.push({
      semester,
      sheetName,
      mapel: subject.mapel,
      mapelKey: subject.key,
      kategori: subject.kategori,
      nilai,
    });
  }

  private createEmptyBuckets(): Record<AcademicCategory, CategoryBucket> {
    return NILAI_AKADEMIK_CATEGORIES.reduce(
      (acc, category) => {
        acc[category] = { sum: 0, count: 0, mapel: new Set<string>() };
        return acc;
      },
      {} as Record<AcademicCategory, CategoryBucket>,
    );
  }

  private buildStudentAcademicResult(
    student: StudentAccumulator,
    semesterWeights: Record<number, number>,
    options: ImportNilaiExcelOptions,
  ): StudentAcademicResult {
    const nilaiAkademik = emptyAcademicScores();
    const rincianPerKategori = NILAI_AKADEMIK_CATEGORIES.reduce(
      (acc, category) => {
        acc[category] = [];
        return acc;
      },
      {} as Record<AcademicCategory, FinalCategoryDetail[]>,
    );
    const rincianPerSemester: StudentAcademicResult['rincian_per_semester'] =
      {};

    Object.entries(student.semesters).forEach(
      ([semesterKey, categoryBuckets]) => {
        const semester = Number(semesterKey);
        rincianPerSemester[semester] = NILAI_AKADEMIK_CATEGORIES.reduce(
          (acc, category) => {
            const bucket = categoryBuckets[category];
            acc[category] = {
              rata_rata: bucket.count
                ? roundScore(bucket.sum / bucket.count)
                : null,
              jumlah_mapel: bucket.count,
              mapel: Array.from(bucket.mapel.values()).sort(),
            };
            return acc;
          },
          {} as Record<
            AcademicCategory,
            { rata_rata: number | null; jumlah_mapel: number; mapel: string[] }
          >,
        );
      },
    );

    NILAI_AKADEMIK_CATEGORIES.forEach((category) => {
      let numerator = 0;
      let denominator = 0;

      Object.entries(student.semesters)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([semesterKey, categoryBuckets]) => {
          const semester = Number(semesterKey);
          const bucket = categoryBuckets[category];
          if (!bucket?.count) return;

          const average = bucket.sum / bucket.count;
          const weight = semesterWeights[semester] ?? 1;
          numerator += average * weight;
          denominator += weight;

          rincianPerKategori[category].push({
            semester,
            bobot: weight,
            rata_rata: roundScore(average),
            jumlah_mapel: bucket.count,
            mapel: Array.from(bucket.mapel.values()).sort(),
          });
        });

      nilaiAkademik[category] = denominator
        ? roundScore(numerator / denominator)
        : 0;
    });

    return {
      nisn: student.nisn,
      nama: student.nama,
      jk: student.jk,
      kelas: student.kelas,
      jurusan: options.jurusan || student.jurusan,
      nilai_akademik: nilaiAkademik,
      rincian_per_kategori: rincianPerKategori,
      rincian_per_semester: rincianPerSemester,
      payload_spk: {
        id_siswa: null,
        nama: student.nama,
        tujuan_karir: options.tujuanKarir,
        jenis_sekolah: options.jenisSekolah,
        jurusan_sekolah: options.jurusan || student.jurusan || '',
        top_n: options.topN,
        ...nilaiAkademik,
        minat: [],
        bakat: [],
        hobi: [],
        pengalaman: [],
        prestasi: '',
      },
    };
  }

  private async persistImportResults(
    students: StudentAccumulator[],
    results: StudentAcademicResult[],
    options: ImportNilaiExcelOptions,
  ): Promise<PersistedImportResult> {
    const resultByNisn = new Map(
      results.map((result) => [result.nisn, result]),
    );

    return this.dataSource.transaction(async (manager) => {
      const stats = this.createEmptyDatabaseStats();
      const persistedResults: StudentAcademicResult[] = [];
      const semesterCache = new Map<string, Semester>();
      const mapelCache = new Map<string, MataPelajaran>();
      const kurikulumCache = new Map<string, KurikulumMapel>();
      const siswaByNisn = new Map<string, Siswa>();

      // Tahap 1: data siswa wajib tersedia lebih dahulu supaya nilai_kategori_siswa punya id_siswa yang valid.
      for (const student of students) {
        const result = resultByNisn.get(student.nisn)!;
        const { siswa, akun } = await this.findOrCreateSiswa(
          manager,
          student,
          options,
          stats,
        );
        siswaByNisn.set(student.nisn, siswa);

        result.id_siswa = siswa.id_siswa;
        result.akun = akun;
        result.payload_spk = {
          ...result.payload_spk,
          id_siswa: siswa.id_siswa,
        };
      }

      // Tahap 2-4: mapel, kurikulum_mapel, dan nilai_siswa disimpan dari nilai mentah Excel.
      for (const student of students) {
        const siswa = siswaByNisn.get(student.nisn)!;

        for (const grade of student.rawGrades) {
          const semester = await this.findOrCreateSemester(
            manager,
            grade.semester,
            options,
            semesterCache,
          );
          const mapel = await this.findOrCreateMapel(
            manager,
            grade,
            mapelCache,
            stats,
          );
          const kurikulum = await this.findOrCreateKurikulum(
            manager,
            semester,
            mapel,
            options,
            kurikulumCache,
            stats,
          );
          await this.upsertNilai(manager, siswa, kurikulum, grade.nilai, stats);
        }
      }

      // Tahap 5: hasil agregasi 8 kategori akademik disimpan per id_siswa.
      for (const student of students) {
        const siswa = siswaByNisn.get(student.nisn)!;
        const result = resultByNisn.get(student.nisn)!;
        await this.upsertNilaiKategori(manager, siswa, result, stats);
        persistedResults.push(result);
      }

      return { results: persistedResults, stats };
    });
  }

  private createEmptyDatabaseStats(): ImportDatabaseStats {
    return {
      siswa_dibuat: 0,
      siswa_diupdate: 0,
      mapel_dibuat: 0,
      mapel_diupdate: 0,
      kurikulum_mapel_dibuat: 0,
      nilai_siswa_dibuat: 0,
      nilai_siswa_diupdate: 0,
      nilai_kategori_dibuat: 0,
      nilai_kategori_diupdate: 0,
    };
  }

  private async findOrCreateSiswa(
    manager: EntityManager,
    student: StudentAccumulator,
    options: ImportNilaiExcelOptions,
    stats: ImportDatabaseStats,
  ): Promise<{
    siswa: Siswa;
    akun: StudentAcademicResult['akun'];
  }> {
    const siswaRepo = manager.getRepository(Siswa);
    const userRepo = manager.getRepository(User);
    const jurusanRepo = manager.getRepository(Jurusan);

    let siswa = await siswaRepo.findOne({
      where: { nisn: student.nisn },
      relations: ['user', 'jurusan_detail'],
    });

    const jurusanDetail = options.jurusanId
      ? await jurusanRepo.findOne({ where: { id_jurusan: options.jurusanId } })
      : null;

    if (options.jurusanId && !jurusanDetail) {
      throw new BadRequestException('Jurusan yang dipilih tidak ditemukan.');
    }

    if (
      jurusanDetail &&
      options.sekolahId &&
      jurusanDetail.id_sekolah !== options.sekolahId
    ) {
      throw new BadRequestException(
        'Jurusan tidak sesuai dengan sekolah yang dipilih.',
      );
    }

    const importJurusanName =
      jurusanDetail?.nama_jurusan || options.jurusan || '-';

    let akunBaru = false;
    let username = siswa?.user?.username || '';

    if (!siswa) {
      let user = await userRepo.findOne({
        where: { email: `${student.nisn}@skilllens.local` },
      });

      if (!user) {
        username = await this.generateUniqueUsername(
          userRepo,
          student.nama,
          student.nisn,
        );

        const password = await bcrypt.hash(student.nisn, 12);

        user = await userRepo.save(
          userRepo.create({
            nama: student.nama,
            email: `${student.nisn}@skilllens.local`,
            username,
            password,
            role: 'siswa',
          }),
        );

        akunBaru = true;
      } else {
        username = user.username;
        user.nama = student.nama || user.nama;
        await userRepo.save(user);
      }

      siswa = await siswaRepo.save(
        siswaRepo.create({
          nisn: student.nisn,
          kelas: student.kelas || '-',
          jurusan: importJurusanName,
          id_sekolah: options.sekolahId ?? null,
          sekolah: options.sekolahId ? { id_sekolah: options.sekolahId } : null,
          id_jurusan: jurusanDetail?.id_jurusan ?? options.jurusanId ?? null,
          jurusan_detail: jurusanDetail,
          user,
        }),
      );

      stats.siswa_dibuat += 1;
    } else {
      siswa.kelas = student.kelas || siswa.kelas || '-';
      siswa.jurusan = importJurusanName || siswa.jurusan || '-';
      siswa.id_sekolah = options.sekolahId ?? siswa.id_sekolah ?? null;
      siswa.sekolah = options.sekolahId
        ? ({ id_sekolah: options.sekolahId } as Sekolah)
        : siswa.sekolah;
      siswa.id_jurusan =
        jurusanDetail?.id_jurusan ??
        options.jurusanId ??
        siswa.id_jurusan ??
        null;
      siswa.jurusan_detail = jurusanDetail || siswa.jurusan_detail || null;

      if (siswa.user) {
        siswa.user.nama = student.nama || siswa.user.nama;
        await userRepo.save(siswa.user);
      }

      siswa = await siswaRepo.save(siswa);
      username = siswa.user?.username || username;
      stats.siswa_diupdate += 1;
    }

    return {
      siswa,
      akun: {
        username,
        password_default: student.nisn,
        akun_baru: akunBaru,
        perlu_ganti_password: akunBaru,
      },
    };
  }

  private async generateUniqueUsername(
    userRepo: Repository<User>,
    nama: string,
    nisn: string,
  ): Promise<string> {
    const normalizedName = normalizeSubjectKey(nama).replace(/\s/g, '');
    const base = `${normalizedName}${nisn.slice(-4)}` || `siswa${nisn}`;
    let username = base;
    let index = 1;

    while (await userRepo.findOne({ where: { username } })) {
      username = `${base}${index}`;
      index += 1;
    }

    return username;
  }

  private async findOrCreateSemester(
    manager: EntityManager,
    semesterNumber: number,
    options: ImportNilaiExcelOptions,
    cache: Map<string, Semester>,
  ): Promise<Semester> {
    const repo = manager.getRepository(Semester);
    const nama_semester = `Semester ${semesterNumber}`;

    const tahunAjaranUntukSemester = this.computeTahunAjaranForSemester(
      semesterNumber,
      options.tahunAjaran,
    );

    const key = `${nama_semester}|${tahunAjaranUntukSemester}`;
    const cached = cache.get(key);
    if (cached) return cached;

    let semester = await repo.findOne({
      where: { nama_semester, tahun_ajaran: tahunAjaranUntukSemester },
    });

    if (!semester) {
      semester = await repo.save(
        repo.create({
          nama_semester,
          tahun_ajaran: tahunAjaranUntukSemester,
        }),
      );
    }

    cache.set(key, semester);
    return semester;
  }

  private computeTahunAjaranForSemester(
    semesterNumber: number,
    baseTahunAjaran: string,
  ): string {
    // baseTahunAjaran format: "YYYY/YYYY+1"
    const [startStr] = String(baseTahunAjaran).split('/');
    const baseStartYear = Number(startStr);

    if (!Number.isFinite(baseStartYear)) {
      // fallback: tetap pakai base yang dikirim
      return baseTahunAjaran;
    }

    const groupIndex = Math.floor((semesterNumber - 1) / 2); // (1-2)->0, (3-4)->1, (5-6)->2
    const startYear = baseStartYear + groupIndex;
    const endYear = startYear + 1;

    return `${startYear}/${endYear}`;
  }

  private async findOrCreateMapel(
    manager: EntityManager,
    grade: ParsedGrade,
    cache: Map<string, MataPelajaran>,
    stats: ImportDatabaseStats,
  ): Promise<MataPelajaran> {
    const repo = manager.getRepository(MataPelajaran);
    const cached = cache.get(grade.mapelKey);
    if (cached) return cached;

    let mapel = await repo.findOne({ where: { kode_mapel: grade.mapelKey } });
    if (!mapel) {
      mapel = await repo.findOne({ where: { nama_mapel: grade.mapel } });
    }

    if (!mapel) {
      mapel = repo.create({
        nama_mapel: grade.mapel,
        kode_mapel: grade.mapelKey,
        kategori: grade.kategori,
      });
      mapel = await repo.save(mapel);
      stats.mapel_dibuat += 1;
    } else {
      const perluUpdate =
        mapel.kode_mapel !== grade.mapelKey ||
        mapel.kategori !== grade.kategori ||
        mapel.nama_mapel !== grade.mapel;
      mapel.kode_mapel = mapel.kode_mapel || grade.mapelKey;
      mapel.kategori = grade.kategori;
      mapel.nama_mapel = mapel.nama_mapel || grade.mapel;
      mapel = await repo.save(mapel);
      if (perluUpdate) stats.mapel_diupdate += 1;
    }

    cache.set(grade.mapelKey, mapel);
    return mapel;
  }

  private async findOrCreateKurikulum(
    manager: EntityManager,
    semester: Semester,
    mapel: MataPelajaran,
    options: ImportNilaiExcelOptions,
    cache: Map<string, KurikulumMapel>,
    stats: ImportDatabaseStats,
  ): Promise<KurikulumMapel> {
    const repo = manager.getRepository(KurikulumMapel);
    const key = `${options.sekolahId || 'none'}|${options.jurusanId || 'none'}|${semester.id_semester}|${mapel.id_mapel}`;
    const cached = cache.get(key);
    if (cached) return cached;

    let kurikulum = await repo.findOne({
      where: {
        id_sekolah: options.sekolahId ?? IsNull(),
        id_jurusan: options.jurusanId ?? IsNull(),
        id_semester: semester.id_semester,
        id_mapel: mapel.id_mapel,
      },
    });

    if (!kurikulum) {
      kurikulum = repo.create({
        id_sekolah: options.sekolahId ?? null,
        sekolah: options.sekolahId ? { id_sekolah: options.sekolahId } : null,
        id_jurusan: options.jurusanId ?? null,
        jurusan: options.jurusanId ? { id_jurusan: options.jurusanId } : null,
        id_semester: semester.id_semester,
        semester,
        id_mapel: mapel.id_mapel,
        mata_pelajaran: mapel,
      });
      kurikulum = await repo.save(kurikulum);
      stats.kurikulum_mapel_dibuat += 1;
    }

    cache.set(key, kurikulum);
    return kurikulum;
  }

  private async upsertNilai(
    manager: EntityManager,
    siswa: Siswa,
    kurikulum: KurikulumMapel,
    nilai: number,
    stats: ImportDatabaseStats,
  ): Promise<void> {
    const repo = manager.getRepository(NilaiSiswa);
    let row = await repo.findOne({
      where: {
        id_siswa: siswa.id_siswa,
        id_kurikulum_mapel: kurikulum.id_kurikulum_mapel,
      },
    });

    if (!row) {
      row = repo.create({
        nilai,
        id_siswa: siswa.id_siswa,
        siswa,
        id_kurikulum_mapel: kurikulum.id_kurikulum_mapel,
        kurikulum_mapel: kurikulum,
      });
      stats.nilai_siswa_dibuat += 1;
    } else {
      row.nilai = nilai;
      stats.nilai_siswa_diupdate += 1;
    }

    await repo.save(row);
  }

  private async upsertNilaiKategori(
    manager: EntityManager,
    siswa: Siswa,
    result: StudentAcademicResult,
    stats: ImportDatabaseStats,
  ): Promise<void> {
    const repo = manager.getRepository(NilaiKategoriSiswa);

    for (const category of NILAI_AKADEMIK_CATEGORIES) {
      const detail = result.rincian_per_kategori[category];
      const totalMapel = detail.reduce(
        (sum, item) => sum + item.jumlah_mapel,
        0,
      );
      const totalBobot = detail.reduce((sum, item) => sum + item.bobot, 0);

      let row = await repo.findOne({
        where: { id_siswa: siswa.id_siswa, kategori: category },
      });
      if (!row) {
        row = repo.create({
          id_siswa: siswa.id_siswa,
          siswa,
          kategori: category,
        });
        stats.nilai_kategori_dibuat += 1;
      } else {
        stats.nilai_kategori_diupdate += 1;
      }

      row.nilai = result.nilai_akademik[category];
      row.total_bobot_terpakai = roundScore(totalBobot, 4);
      row.jumlah_mapel_terpakai = totalMapel;
      row.rincian_semester = detail;
      await repo.save(row);
    }
  }
}
