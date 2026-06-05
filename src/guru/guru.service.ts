import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Guru } from './entities/guru.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { NilaiSiswa } from '../nilai_siswa/entities/nilai_siswa.entity';
import { RecommendationRun } from '../recommendations/entities/recommendation-run.entity';
import { RecommendationResult } from '../recommendations/entities/recommendation-result.entity';
import { StudentRoadmap } from '../roadmaps/entities/student-roadmap.entity';
import { StudentRoadmapProgress } from '../roadmaps/entities/student-roadmap-progress.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { GuidanceNote } from './entities/guidance-note.entity';

@Injectable()
export class GuruService {
  constructor(
    @InjectRepository(Guru) private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Siswa) private readonly siswaRepo: Repository<Siswa>,
    @InjectRepository(NilaiKategoriSiswa)
    private readonly kategoriRepo: Repository<NilaiKategoriSiswa>,
    @InjectRepository(NilaiSiswa)
    private readonly nilaiRepo: Repository<NilaiSiswa>,
    @InjectRepository(RecommendationRun)
    private readonly recommendationRunRepo: Repository<RecommendationRun>,
    @InjectRepository(RecommendationResult)
    private readonly recommendationResultRepo: Repository<RecommendationResult>,
    @InjectRepository(StudentRoadmap)
    private readonly studentRoadmapRepo: Repository<StudentRoadmap>,
    @InjectRepository(StudentRoadmapProgress)
    private readonly studentRoadmapProgressRepo: Repository<StudentRoadmapProgress>,
    @InjectRepository(Sekolah)
    private readonly sekolahRepo: Repository<Sekolah>,
    @InjectRepository(Jurusan)
    private readonly jurusanRepo: Repository<Jurusan>,
    @InjectRepository(GuidanceNote)
    private readonly guidanceNoteRepo: Repository<GuidanceNote>,
  ) {}

  private async getGuruByUserId(userId: number) {
    const guru = await this.guruRepo.findOne({
      where: { user: { id_user: userId } as any },
      relations: ['user', 'sekolah'],
    });

    if (!guru) {
      throw new NotFoundException('Profil guru tidak ditemukan.');
    }

    return guru;
  }

  private ensureApprovedSchool(guru: Guru) {
    if (!guru.sekolah) {
      throw new ForbiddenException(
        'Akses belum tersedia. Pilih atau ajukan sekolah terlebih dahulu.',
      );
    }

    if (guru.sekolah.status_verifikasi !== 'approved') {
      throw new ForbiddenException('Sekolah masih menunggu verifikasi admin.');
    }
  }

  private async ensureSmaMajors(sekolahId: number) {
    const smaMajors = ['IPA', 'IPS', 'BAHASA'];

    // Jika jenis sekolah SMA, pastikan jurusan tabel sudah ada 3 record standar.
    const existingRows = await this.jurusanRepo.find({
      where: { id_sekolah: sekolahId },
      select: ['nama_jurusan', 'id_jurusan'],
    });

    const existingNames = new Set(existingRows.map((r) => r.nama_jurusan));

    for (const nama_jurusan of smaMajors) {
      if (existingNames.has(nama_jurusan)) continue;

      const sekolah = await this.sekolahRepo.findOne({ where: { id_sekolah: sekolahId } });
      if (!sekolah) continue;

      await this.jurusanRepo.save(
        this.jurusanRepo.create({
          id_sekolah: sekolahId,
          sekolah,
          nama_jurusan,
        }),
      );
    }
  }

  async getWorkspace(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    const schoolStatus = guru.sekolah?.status_verifikasi ?? 'belum_diajukan';
    const canAccessWorkspace = Boolean(
      guru.sekolah && guru.sekolah.status_verifikasi === 'approved',
    );

    const jurusan = canAccessWorkspace
      ? await this.jurusanRepo.find({
          where: { sekolah: { id_sekolah: guru.sekolah!.id_sekolah } as any },
          order: { nama_jurusan: 'ASC' },
        })
      : [];

    const siswaCount = canAccessWorkspace
      ? await this.siswaRepo.count({
          where: { id_sekolah: guru.sekolah!.id_sekolah },
        })
      : 0;

    return {
      guru: {
        id_guru: guru.id_guru,
        nama: guru.user.nama,
        email: guru.user.email,
        nip: guru.nip,
        jabatan: guru.jabatan,
      },
      sekolah: guru.sekolah
        ? {
            id: guru.sekolah.id_sekolah,
            nama: guru.sekolah.nama_sekolah,
            jenis: guru.sekolah.jenis_sekolah,
            alamat: guru.sekolah.alamat,
            status: guru.sekolah.status_verifikasi,
          }
        : null,
      canAccessWorkspace,
      lockReason: canAccessWorkspace
        ? null
        : guru.sekolah
          ? 'Sekolah sedang menunggu verifikasi admin.'
          : 'Guru belum memilih atau mengajukan sekolah.',
      stats: {
        siswa: siswaCount,
        jurusan: jurusan.length,
        dataValid: 0,
        perluReview: 0,
      },
      jurusan: jurusan.map((item) => ({
        id: item.id_jurusan,
        nama: item.nama_jurusan,
      })),
    };
  }

  async chooseSchool(userId: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    const idSekolah = Number(body?.id_sekolah ?? body?.sekolahId ?? 0);

    if (!idSekolah) {
      throw new BadRequestException('ID sekolah wajib dikirim.');
    }

    const sekolah = await this.sekolahRepo.findOne({
      where: { id_sekolah: idSekolah },
    });
    if (!sekolah) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    guru.sekolah = sekolah;
    guru.id_sekolah = sekolah.id_sekolah;
    await this.guruRepo.save(guru);

    return {
      message:
        sekolah.status_verifikasi === 'approved'
          ? 'Sekolah berhasil dipilih. Ruang kerja sudah dapat digunakan.'
          : 'Sekolah berhasil dipilih dan menunggu verifikasi admin.',
      sekolah: {
        id: sekolah.id_sekolah,
        nama: sekolah.nama_sekolah,
        status: sekolah.status_verifikasi,
      },
    };
  }

  async requestNewSchool(userId: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    const namaSekolah = String(
      body?.nama_sekolah ?? body?.namaSekolah ?? '',
    ).trim();
    const jenisSekolah = String(body?.jenis_sekolah ?? body?.jenisSekolah ?? '')
      .trim()
      .toUpperCase();

    if (!namaSekolah || !['SMA', 'SMK'].includes(jenisSekolah)) {
      throw new BadRequestException(
        'Nama sekolah dan jenis sekolah wajib diisi.',
      );
    }

    const sekolah = await this.sekolahRepo.save(
      this.sekolahRepo.create({
        nama_sekolah: namaSekolah,
        npsn: body?.npsn ? String(body.npsn).trim() : null,
        alamat: body?.alamat ? String(body.alamat).trim() : null,
        no_hp_sekolah: body?.no_hp_sekolah
          ? String(body.no_hp_sekolah).trim()
          : null,
        jenis_sekolah: jenisSekolah as 'SMA' | 'SMK',
        status_verifikasi: 'pending',
      }),
    );

    guru.sekolah = sekolah;
    guru.id_sekolah = sekolah.id_sekolah;
    await this.guruRepo.save(guru);

    return {
      message:
        'Pengajuan sekolah berhasil dikirim. Ruang kerja akan aktif setelah admin menyetujui sekolah.',
      sekolah: {
        id: sekolah.id_sekolah,
        nama: sekolah.nama_sekolah,
        status: sekolah.status_verifikasi,
      },
    };
  }

  async getJurusan(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const rows = await this.jurusanRepo.find({
      where: { id_sekolah: guru.sekolah!.id_sekolah },
      order: { nama_jurusan: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id_jurusan,
      nama: row.nama_jurusan,
      id_sekolah: row.id_sekolah,
    }));
  }

  async createJurusan(userId: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const namaJurusan = String(
      body?.nama_jurusan ?? body?.namaJurusan ?? body?.nama ?? '',
    ).trim();
    if (!namaJurusan) {
      throw new BadRequestException('Nama jurusan wajib diisi.');
    }

    const existing = await this.jurusanRepo.findOne({
      where: {
        id_sekolah: guru.sekolah!.id_sekolah,
        nama_jurusan: namaJurusan,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Jurusan tersebut sudah terdaftar di sekolah ini.',
      );
    }

    const jurusan = this.jurusanRepo.create({
      id_sekolah: guru.sekolah!.id_sekolah,
      sekolah: guru.sekolah!,
      nama_jurusan: namaJurusan,
    });

    const saved = await this.jurusanRepo.save(jurusan);

    return {
      message: 'Jurusan berhasil ditambahkan.',
      data: {
        id: saved.id_jurusan,
        nama: saved.nama_jurusan,
        id_sekolah: saved.id_sekolah,
      },
    };
  }

  async updateJurusan(userId: number, id: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const namaJurusan = String(
      body?.nama_jurusan ?? body?.namaJurusan ?? body?.nama ?? '',
    ).trim();
    if (!namaJurusan) {
      throw new BadRequestException('Nama jurusan wajib diisi.');
    }

    const jurusan = await this.jurusanRepo.findOne({
      where: {
        id_jurusan: id,
        id_sekolah: guru.sekolah!.id_sekolah,
      },
    });

    if (!jurusan) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    const existing = await this.jurusanRepo.findOne({
      where: {
        id_sekolah: guru.sekolah!.id_sekolah,
        nama_jurusan: namaJurusan,
      },
    });

    if (existing && existing.id_jurusan !== id) {
      throw new BadRequestException(
        'Nama jurusan sudah digunakan di sekolah ini.',
      );
    }

    jurusan.nama_jurusan = namaJurusan;
    const saved = await this.jurusanRepo.save(jurusan);

    return {
      message: 'Jurusan berhasil diperbarui.',
      data: {
        id: saved.id_jurusan,
        nama: saved.nama_jurusan,
        id_sekolah: saved.id_sekolah,
      },
    };
  }

  async deleteJurusan(userId: number, id: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const jurusan = await this.jurusanRepo.findOne({
      where: {
        id_jurusan: id,
        id_sekolah: guru.sekolah!.id_sekolah,
      },
    });

    if (!jurusan) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    await this.jurusanRepo.remove(jurusan);

    return {
      message: 'Jurusan berhasil dihapus.',
    };
  }

  private mapRecommendationResult(row: RecommendationResult) {
    return {
      id: row.id_recommendation_result,
      rank: row.rank_order,
      title: row.alternative_name,
      category: row.alternative_type ?? 'Rekomendasi',
      score: Number(row.score ?? 0),
      roadmapId: row.roadmap_id ?? null,
      summary:
        row.detail?.alasan ??
        row.detail?.summary ??
        row.detail?.deskripsi ??
        'Rekomendasi berdasarkan nilai akademik dan profil siswa.',
    };
  }

  private safeParseJson(value: any) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') return value;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private mapRawRecommendationResult(row: any): RecommendationResult {
    return {
      id_recommendation_result: Number(row.id_recommendation_result),
      id_recommendation_run: Number(row.id_recommendation_run),
      rank_order: Number(row.rank_order ?? 0),
      alternative_id:
        row.alternative_id === null || row.alternative_id === undefined
          ? null
          : Number(row.alternative_id),
      roadmap_id:
        row.roadmap_id === null || row.roadmap_id === undefined
          ? null
          : Number(row.roadmap_id),
      alternative_name: String(row.alternative_name ?? 'Rekomendasi'),
      alternative_type: row.alternative_type ?? null,
      score: Number(row.score ?? 0),
      detail: this.safeParseJson(row.detail),
      created_at: row.created_at,
    } as RecommendationResult;
  }

  private async getLatestRecommendationsByStudentIds(studentIds: number[]) {
    const latestRunByStudent = new Map<number, RecommendationRun>();
    if (!studentIds.length) {
      return { runs: latestRunByStudent, results: new Map<number, RecommendationResult[]>() };
    }

    // Pakai raw query supaya data JSON lama/kosong di kolom simple-json tidak membuat TypeORM gagal hydration.
    const placeholders = studentIds.map(() => '?').join(',');
    const runs = await this.recommendationRunRepo.query(
      `SELECT id_recommendation_run, id_siswa, run_code, status, created_at
       FROM recommendation_runs
       WHERE id_siswa IN (${placeholders}) AND status = 'success'
       ORDER BY id_recommendation_run DESC`,
      studentIds,
    );

    for (const raw of runs) {
      const siswaId = Number(raw.id_siswa);
      if (!latestRunByStudent.has(siswaId)) {
        latestRunByStudent.set(siswaId, {
          id_recommendation_run: Number(raw.id_recommendation_run),
          id_siswa: siswaId,
          run_code: raw.run_code ?? null,
          status: raw.status ?? 'success',
          created_at: raw.created_at,
        } as RecommendationRun);
      }
    }

    const latestRunIds = Array.from(latestRunByStudent.values()).map(
      (run) => run.id_recommendation_run,
    );
    const resultsByRun = new Map<number, RecommendationResult[]>();

    if (latestRunIds.length) {
      const runPlaceholders = latestRunIds.map(() => '?').join(',');
      const results = await this.recommendationResultRepo.query(
        `SELECT id_recommendation_result, id_recommendation_run, rank_order, alternative_id,
                roadmap_id, alternative_name, alternative_type, score, detail, created_at
         FROM recommendation_results
         WHERE id_recommendation_run IN (${runPlaceholders})
         ORDER BY rank_order ASC`,
        latestRunIds,
      );

      for (const raw of results) {
        const result = this.mapRawRecommendationResult(raw);
        const group = resultsByRun.get(result.id_recommendation_run) ?? [];
        group.push(result);
        resultsByRun.set(result.id_recommendation_run, group);
      }
    }

    return { runs: latestRunByStudent, results: resultsByRun };
  }

  private async getActiveRoadmapsByStudentIds(studentIds: number[]) {
    const activeByStudent = new Map<number, StudentRoadmap>();
    if (!studentIds.length) return activeByStudent;

    const rows = await this.studentRoadmapRepo.find({
      where: { id_siswa: In(studentIds), status: 'aktif' } as any,
      relations: ['roadmap'],
      order: { id_student_roadmap: 'DESC' } as any,
    });

    for (const row of rows) {
      if (!activeByStudent.has(row.id_siswa)) {
        activeByStudent.set(row.id_siswa, row);
      }
    }

    return activeByStudent;
  }

  private async getProgressPercentByStudentRoadmapIds(studentRoadmapIds: number[]) {
    const percentByRoadmap = new Map<number, number>();
    if (!studentRoadmapIds.length) return percentByRoadmap;

    const rows = await this.studentRoadmapProgressRepo.find({
      where: { id_student_roadmap: In(studentRoadmapIds) } as any,
    });

    const grouped = new Map<number, StudentRoadmapProgress[]>();
    for (const row of rows) {
      const group = grouped.get(row.id_student_roadmap) ?? [];
      group.push(row);
      grouped.set(row.id_student_roadmap, group);
    }

    for (const id of studentRoadmapIds) {
      const group = grouped.get(id) ?? [];
      const total = group.length;
      const selesai = group.filter((row) => row.status === 'selesai').length;
      percentByRoadmap.set(id, total ? Math.round((selesai / total) * 100) : 0);
    }

    return percentByRoadmap;
  }

  async getGuidanceCases(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const siswa = await this.siswaRepo.find({
      where: { id_sekolah: guru.sekolah!.id_sekolah },
      relations: ['user'],
      take: 30,
      order: { id_siswa: 'DESC' },
    });

    if (siswa.length === 0) return [];

    const siswaIds = siswa.map((item) => item.id_siswa);
    const nilaiRows = await this.kategoriRepo.find({
      where: { id_siswa: In(siswaIds) },
    });

    const nilaiBySiswa = new Map<number, NilaiKategoriSiswa[]>();
    for (const row of nilaiRows) {
      const group = nilaiBySiswa.get(row.id_siswa) ?? [];
      group.push(row);
      nilaiBySiswa.set(row.id_siswa, group);
    }

    const [{ runs: latestRunByStudent, results: resultsByRun }, activeRoadmaps, latestGuidanceNotes] = await Promise.all([
      this.getLatestRecommendationsByStudentIds(siswaIds),
      this.getActiveRoadmapsByStudentIds(siswaIds),
      this.guidanceNoteRepo.find({
        where: { id_siswa: In(siswaIds) } as any,
        order: { created_at: 'DESC' } as any,
      }),
    ]);

    const latestNoteByStudent = new Map<number, GuidanceNote>();
    for (const note of latestGuidanceNotes) {
      if (!latestNoteByStudent.has(note.id_siswa)) {
        latestNoteByStudent.set(note.id_siswa, note);
      }
    }

    const progressByRoadmap = await this.getProgressPercentByStudentRoadmapIds(
      Array.from(activeRoadmaps.values()).map((row) => row.id_student_roadmap),
    );

    return siswa.map((item) => {
      const nilai = nilaiBySiswa.get(item.id_siswa) ?? [];
      const avg = nilai.length
        ? Math.round(
            nilai.reduce((sum, row) => sum + Number(row.nilai || 0), 0) /
              nilai.length,
          )
        : 0;
      const priority = avg && avg < 75 ? 'Tinggi' : avg < 85 ? 'Sedang' : 'Normal';
      const latestRun = latestRunByStudent.get(item.id_siswa) ?? null;
      const recommendationRows = latestRun
        ? (resultsByRun.get(latestRun.id_recommendation_run) ?? []).slice(0, 3)
        : [];
      const recommendations = recommendationRows.map((row) => this.mapRecommendationResult(row));
      const activeRoadmap = activeRoadmaps.get(item.id_siswa) ?? null;
      const selectedRecommendation = recommendations.find(
        (row) => Number(row.roadmapId || 0) === Number(activeRoadmap?.id_roadmap || 0),
      ) ?? recommendations[0] ?? null;
      const roadmapProgress = activeRoadmap
        ? (progressByRoadmap.get(activeRoadmap.id_student_roadmap) ?? 0)
        : 0;
      const latestNote = latestNoteByStudent.get(item.id_siswa) ?? null;
      const lastNoteText = latestNote
        ? `${latestNote.topic}: ${latestNote.note}`
        : activeRoadmap
          ? 'Roadmap siswa sudah aktif. Buka chat untuk memberi arahan pada tahap yang sedang berjalan.'
          : latestRun
            ? 'Siswa sudah mendapatkan rekomendasi. Arahkan siswa memilih roadmap yang paling sesuai.'
            : 'Belum ada chat bimbingan terbaru.';

      return {
        id: `g-${item.id_siswa}`,
        studentId: String(item.id_siswa),
        studentName: item.user?.nama ?? item.nisn,
        nisn: item.nisn,
        className: item.kelas,
        jurusan: item.jurusan ?? null,
        phone: item.user?.no_hp ?? null,
        topic: avg
          ? 'Tindak lanjut hasil rekomendasi dari layanan SPK'
          : 'Lengkapi data akademik dan profil siswa',
        priority,
        status: activeRoadmap ? 'Roadmap aktif' : latestRun ? 'Belum memilih roadmap' : 'Belum generate rekomendasi',
        requestedAt: new Date().toLocaleDateString('id-ID'),
        schedule: 'Belum dijadwalkan',
        recommendation:
          selectedRecommendation?.title ??
          (avg >= 85
            ? 'Kandidat prioritas untuk rekomendasi lanjutan'
            : avg >= 75
              ? 'Perlu validasi minat dan tujuan'
              : 'Perlu pendampingan akademik dasar'),
        recommendations,
        selectedRecommendation,
        selectedRoadmapId: activeRoadmap?.id_roadmap ?? null,
        selectedRoadmapTitle: activeRoadmap?.roadmap?.title ?? selectedRecommendation?.title ?? null,
        hasActiveRoadmap: Boolean(activeRoadmap),
        lastNote: lastNoteText,
        latestNoteAt: latestNote?.created_at ?? null,
        progress: activeRoadmap ? roadmapProgress : 0,
      };
    });
  }

  async getSiswaAccounts(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    // Password tidak ditampilkan ulang. Password sementara hanya muncul sekali saat import akun baru.
    const siswaRows = await this.siswaRepo.find({
      where: { id_sekolah: guru.sekolah!.id_sekolah },
      relations: ['user'],
      order: { id_siswa: 'ASC' },
    });

    return siswaRows
      .filter((row) => Boolean(row.user))
      .map((row) => ({
        nisn: row.nisn,
        nama: row.user?.nama ?? row.nisn,
        username: row.user?.username ?? '',
        must_change_password: row.user?.must_change_password === 1,
        akun_baru: false,
      }));
  }

  async getNilaiSiswa(userId: number, siswaId: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);
    await this.ensureStudentInGuruSchool(guru, siswaId);

    const siswa = await this.siswaRepo.findOne({
      where: { id_siswa: siswaId },
      relations: ['user'],
    });

    if (!siswa) {
      throw new NotFoundException('Siswa tidak ditemukan.');
    }

    const nilaiRows = await this.nilaiRepo.find({
      where: { id_siswa: siswaId },
      relations: [
        'kurikulum_mapel',
        'kurikulum_mapel.semester',
        'kurikulum_mapel.mata_pelajaran',
      ],
      order: { id_nilai: 'ASC' },
    });

    function parseSemesterName(value?: string | null) {
      const match = String(value ?? '').match(/\d+/);
      return match ? Number(match[0]) : null;
    }

    function labelKategori(kategori: string) {
      const labels: Record<string, string> = {
        numerik: 'Numerik',
        bahasa: 'Bahasa',
        sains: 'Sains',
        sosial: 'Sosial',
        teknologi: 'Teknologi',
        agama: 'Agama',
        kreativitas: 'Kreativitas',
        softskill: 'Softskill',
      };
      return labels[kategori] || kategori;
    }

    const data = nilaiRows
      .map((row) => {
        const kurikulum = row.kurikulum_mapel;
        const mapel = kurikulum?.mata_pelajaran;
        const namaMapel = mapel?.nama_mapel?.trim();
        if (!namaMapel) return null;

        const semester =
          mapel?.semester ??
          parseSemesterName(kurikulum?.semester?.nama_semester) ??
          0;
        const kategori = String(mapel?.kategori || 'softskill');

        return {
          id_nilai: row.id_nilai,
          id_kurikulum_mapel: row.id_kurikulum_mapel ?? kurikulum?.id_kurikulum_mapel,
          nama_mapel: namaMapel,
          nilai: row.nilai,
          semester,
          kategori,
          kategori_label: labelKategori(kategori),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (a.semester !== b.semester) return a.semester - b.semester;
        return a.nama_mapel.localeCompare(b.nama_mapel);
      });

    return { data };
  }

  async listGuidanceNotes(userId: number, idSiswa: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);
    await this.ensureStudentInGuruSchool(guru, idSiswa);

    const rows = await this.guidanceNoteRepo.find({
      where: { id_siswa: idSiswa },
      relations: ['guru', 'guru.user'],
      order: { id_guidance_note: 'DESC' },
    });

    return rows.map((row) => ({
      id_guidance_note: row.id_guidance_note,
      topic: row.topic,
      note: row.note,
      follow_up: row.follow_up,
      status: row.status,
      guru: {
        id_guru: row.guru?.id_guru,
        nama: row.guru?.user?.nama ?? 'Guru',
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async createGuidanceNote(userId: number, idSiswa: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);
    const siswa = await this.ensureStudentInGuruSchool(guru, idSiswa);

    const topic = String(body?.topic ?? body?.topik ?? '').trim();
    const note = String(body?.note ?? body?.catatan ?? '').trim();
    const followUp = String(body?.follow_up ?? body?.tindak_lanjut ?? '').trim();

    if (!topic || !note) {
      throw new BadRequestException('Topik dan catatan bimbingan wajib diisi.');
    }

    const saved = await this.guidanceNoteRepo.save(
      this.guidanceNoteRepo.create({
        id_siswa: siswa.id_siswa,
        siswa,
        id_guru: guru.id_guru,
        guru,
        topic,
        note,
        follow_up: followUp || null,
        status: body?.status === 'selesai' ? 'selesai' : 'aktif',
      }),
    );

    return {
      message: 'Catatan bimbingan berhasil disimpan.',
      data: saved,
    };
  }

  private async ensureStudentInGuruSchool(guru: Guru, idSiswa: number) {
    const siswa = await this.siswaRepo.findOne({
      where: { id_siswa: idSiswa },
      relations: ['user'],
    });

    if (!siswa) {
      throw new NotFoundException('Siswa tidak ditemukan.');
    }

    if (siswa.id_sekolah !== guru.id_sekolah) {
      throw new ForbiddenException('Guru hanya boleh mengakses siswa di sekolahnya.');
    }

    return siswa;
  }

}
