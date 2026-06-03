import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Guru } from '../guru/entities/guru.entity';
import { RoadmapMaster } from '../roadmap_master/entities/roadmap_master.entity';
import { RoadmapStep } from '../roadmap_step/entities/roadmap_step.entity';
import { RoadmapStepDetail } from '../roadmap_step_detail/entities/roadmap_step_detail.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { User } from '../user/entities/user.entity';
import { CreateStepNoteDto } from './dto/create-step-note.dto';
import { SelectRoadmapDto } from './dto/select-roadmap.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { RoadmapStepNote } from './entities/roadmap-step-note.entity';
import { StudentRoadmapProgress } from './entities/student-roadmap-progress.entity';
import { StudentRoadmap } from './entities/student-roadmap.entity';

@Injectable()
export class RoadmapsService {
  constructor(
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Guru)
    private readonly guruRepo: Repository<Guru>,
    @InjectRepository(RoadmapMaster)
    private readonly roadmapRepo: Repository<RoadmapMaster>,
    @InjectRepository(RoadmapStep)
    private readonly stepRepo: Repository<RoadmapStep>,
    @InjectRepository(RoadmapStepDetail)
    private readonly detailRepo: Repository<RoadmapStepDetail>,
    @InjectRepository(StudentRoadmap)
    private readonly studentRoadmapRepo: Repository<StudentRoadmap>,
    @InjectRepository(StudentRoadmapProgress)
    private readonly progressRepo: Repository<StudentRoadmapProgress>,
    @InjectRepository(RoadmapStepNote)
    private readonly stepNoteRepo: Repository<RoadmapStepNote>,
  ) {}

  async listPublishedRoadmaps() {
    const roadmaps = await this.roadmapRepo.find({
      where: { is_active: 1 },
      relations: ['steps', 'steps.details'],
      order: {
        id_roadmap: 'DESC',
        steps: { step_order: 'ASC', details: { detail_order: 'ASC' } },
      } as any,
    });

    return roadmaps.map((roadmap) => this.mapRoadmapTemplate(roadmap));
  }

  async selectRoadmap(userId: number, dto: SelectRoadmapDto) {
    const siswa = await this.getSiswaByUserId(userId);
    const roadmap = await this.roadmapRepo.findOne({
      where: { id_roadmap: dto.id_roadmap, is_active: 1 },
      relations: ['steps', 'steps.details'],
      order: { steps: { step_order: 'ASC', details: { detail_order: 'ASC' } } } as any,
    });

    if (!roadmap) throw new NotFoundException('Roadmap tidak ditemukan atau belum aktif.');

    const detailIds = roadmap.steps
      .filter((step) => step.is_active === 1)
      .flatMap((step) => step.details.filter((detail) => detail.is_active === 1));

    if (detailIds.length === 0) {
      throw new BadRequestException('Roadmap belum memiliki detail step yang aktif.');
    }

    let studentRoadmap = await this.studentRoadmapRepo.findOne({
      where: {
        id_siswa: siswa.id_siswa,
        id_roadmap: roadmap.id_roadmap,
        status: 'aktif',
      },
    });

    if (!studentRoadmap) {
      await this.studentRoadmapRepo.update(
        { id_siswa: siswa.id_siswa, status: 'aktif' } as any,
        { status: 'dibatalkan', completed_at: new Date() } as any,
      );

      studentRoadmap = await this.studentRoadmapRepo.save(
        this.studentRoadmapRepo.create({
          id_siswa: siswa.id_siswa,
          siswa,
          id_roadmap: roadmap.id_roadmap,
          roadmap,
          status: 'aktif',
          started_at: new Date(),
          completed_at: null,
        }),
      );
    }

    for (const detail of detailIds) {
      const existing = await this.progressRepo.findOne({
        where: {
          id_student_roadmap: studentRoadmap.id_student_roadmap,
          id_roadmap_step_detail: detail.id_roadmap_step_detail,
        },
      });

      if (existing) continue;

      await this.progressRepo.save(
        this.progressRepo.create({
          id_student_roadmap: studentRoadmap.id_student_roadmap,
          studentRoadmap,
          id_roadmap_step_detail: detail.id_roadmap_step_detail,
          detail,
          status: 'belum',
          completed_at: null,
        }),
      );
    }

    return {
      message: 'Roadmap berhasil dipilih.',
      data: await this.getStudentRoadmapById(studentRoadmap.id_student_roadmap, siswa.id_siswa),
    };
  }

  async getMyRoadmapHistory(userId: number) {
    const siswa = await this.getSiswaByUserId(userId);

    const rows = await this.studentRoadmapRepo.find({
      where: { id_siswa: siswa.id_siswa },
      relations: ['roadmap'],
      order: { id_student_roadmap: 'DESC' },
      take: 20,
    });

    const data = await Promise.all(
      rows.map(async (row) => {
        const progressRows = await this.progressRepo.find({
          where: { id_student_roadmap: row.id_student_roadmap },
        });

        const total = progressRows.length;
        const completed = progressRows.filter((progress) => progress.status === 'selesai').length;
        const inProgress = progressRows.filter((progress) => progress.status === 'proses').length;
        const progressPercent = total ? Math.round((completed / total) * 100) : 0;

        return {
          id_student_roadmap: row.id_student_roadmap,
          id_roadmap: row.id_roadmap,
          title: row.roadmap?.title ?? 'Roadmap Pengembangan Diri',
          recommended_for: row.roadmap?.recommended_for ?? null,
          category: row.roadmap?.category ?? null,
          status: row.status,
          progress_percent: progressPercent,
          total_detail: total,
          completed_detail: completed,
          in_progress_detail: inProgress,
          started_at: row.started_at,
          completed_at: row.completed_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          is_active: row.status === 'aktif',
        };
      }),
    );

    return {
      message: 'Riwayat roadmap berhasil diambil.',
      data,
    };
  }

  async getMyActiveRoadmap(userId: number) {
    const siswa = await this.getSiswaByUserId(userId);
    const active = await this.studentRoadmapRepo.findOne({
      where: { id_siswa: siswa.id_siswa, status: 'aktif' },
      order: { id_student_roadmap: 'DESC' },
    });

    if (!active) {
      return { message: 'Belum ada roadmap aktif.', data: null };
    }

    return {
      message: 'Roadmap aktif berhasil diambil.',
      data: await this.getStudentRoadmapById(active.id_student_roadmap, siswa.id_siswa),
    };
  }

  async updateMyProgress(userId: number, progressId: number, dto: UpdateProgressDto) {
    const siswa = await this.getSiswaByUserId(userId);
    const progress = await this.progressRepo.findOne({
      where: { id_student_roadmap_progress: progressId },
      relations: ['studentRoadmap'],
    });

    if (!progress || progress.studentRoadmap.id_siswa !== siswa.id_siswa) {
      throw new NotFoundException('Progress roadmap tidak ditemukan.');
    }

    progress.status = dto.status;
    progress.progress_note = dto.progress_note?.trim() || null;
    progress.completed_at = dto.status === 'selesai' ? new Date() : null;

    await this.progressRepo.save(progress);
    await this.refreshStudentRoadmapStatus(progress.id_student_roadmap);

    return {
      message: 'Progress roadmap berhasil diperbarui.',
      data: progress,
    };
  }

  async getStudentRoadmapForGuru(guruUserId: number, idSiswa: number) {
    await this.ensureGuruCanAccessStudent(guruUserId, idSiswa);

    const active = await this.studentRoadmapRepo.findOne({
      where: { id_siswa: idSiswa, status: 'aktif' },
      order: { id_student_roadmap: 'DESC' },
    });

    if (!active) {
      return { message: 'Siswa belum memiliki roadmap aktif.', data: null };
    }

    return {
      message: 'Roadmap siswa berhasil diambil.',
      data: await this.getStudentRoadmapById(active.id_student_roadmap, idSiswa, true),
    };
  }

  async addStepNote(guruUserId: number, dto: CreateStepNoteDto) {
    const guru = await this.getGuruByUserId(guruUserId);
    const studentRoadmap = await this.studentRoadmapRepo.findOne({
      where: { id_student_roadmap: dto.id_student_roadmap },
      relations: ['siswa'],
    });

    if (!studentRoadmap) throw new NotFoundException('Roadmap siswa tidak ditemukan.');
    await this.ensureGuruCanAccessStudent(guruUserId, studentRoadmap.id_siswa);

    const step = await this.stepRepo.findOne({
      where: { id_roadmap_step: dto.id_roadmap_step, id_roadmap: studentRoadmap.id_roadmap },
    });

    if (!step) throw new NotFoundException('Step tidak termasuk roadmap siswa tersebut.');

    const note = await this.stepNoteRepo.save(
      this.stepNoteRepo.create({
        id_student_roadmap: studentRoadmap.id_student_roadmap,
        studentRoadmap,
        id_roadmap_step: step.id_roadmap_step,
        step,
        id_guru: guru.id_guru,
        guru,
        title: dto.title?.trim() || null,
        note: dto.note.trim(),
        follow_up: dto.follow_up?.trim() || null,
        visible_to_student: dto.visible_to_student === false ? 0 : 1,
      }),
    );

    return {
      message: 'Catatan step roadmap berhasil ditambahkan.',
      data: note,
    };
  }

  async listStepNotes(guruUserId: number, studentRoadmapId: number, stepId: number) {
    const studentRoadmap = await this.studentRoadmapRepo.findOne({
      where: { id_student_roadmap: studentRoadmapId },
    });

    if (!studentRoadmap) throw new NotFoundException('Roadmap siswa tidak ditemukan.');
    await this.ensureGuruCanAccessStudent(guruUserId, studentRoadmap.id_siswa);

    const rows = await this.stepNoteRepo.find({
      where: { id_student_roadmap: studentRoadmapId, id_roadmap_step: stepId },
      relations: ['guru', 'guru.user'],
      order: { id_roadmap_step_note: 'DESC' },
    });

    return rows.map((note) => this.mapStepNote(note));
  }

  private async getSiswaByUserId(userId: number) {
    const siswa = await this.siswaRepo.findOne({
      where: { user: { id_user: userId } as any },
      relations: ['user', 'sekolah'],
    });
    if (!siswa) throw new NotFoundException('Data siswa tidak ditemukan.');
    return siswa;
  }

  private async getGuruByUserId(userId: number) {
    const guru = await this.guruRepo.findOne({
      where: { user: { id_user: userId } as any },
      relations: ['user', 'sekolah'],
    });
    if (!guru) throw new NotFoundException('Data guru tidak ditemukan.');
    if (!guru.sekolah || guru.sekolah.status_verifikasi !== 'approved') {
      throw new ForbiddenException('Guru belum memiliki sekolah aktif/terverifikasi.');
    }
    return guru;
  }

  private async ensureGuruCanAccessStudent(guruUserId: number, idSiswa: number) {
    const guru = await this.getGuruByUserId(guruUserId);
    const siswa = await this.siswaRepo.findOne({ where: { id_siswa: idSiswa } });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan.');
    if (siswa.id_sekolah !== guru.id_sekolah) {
      throw new ForbiddenException('Guru hanya boleh mengakses siswa di sekolahnya.');
    }
    return { guru, siswa };
  }

  private async getStudentRoadmapById(studentRoadmapId: number, idSiswa: number, includeHiddenNotes = false) {
    const studentRoadmap = await this.studentRoadmapRepo.findOne({
      where: { id_student_roadmap: studentRoadmapId, id_siswa: idSiswa },
      relations: ['roadmap'],
    });

    if (!studentRoadmap) throw new NotFoundException('Roadmap siswa tidak ditemukan.');

    const roadmap = await this.roadmapRepo.findOne({
      where: { id_roadmap: studentRoadmap.id_roadmap },
      relations: ['steps', 'steps.details'],
      order: { steps: { step_order: 'ASC', details: { detail_order: 'ASC' } } } as any,
    });

    if (!roadmap) throw new NotFoundException('Template roadmap tidak ditemukan.');

    const progressRows = await this.progressRepo.find({
      where: { id_student_roadmap: studentRoadmap.id_student_roadmap },
      relations: ['detail'],
    });

    const notes = await this.stepNoteRepo.find({
      where: { id_student_roadmap: studentRoadmap.id_student_roadmap },
      relations: ['guru', 'guru.user'],
      order: { id_roadmap_step_note: 'DESC' },
    });

    const progressByDetail = new Map<number, StudentRoadmapProgress>(
      progressRows.map((row) => [row.id_roadmap_step_detail, row] as [number, StudentRoadmapProgress]),
    );
    const notesByStep = new Map<number, RoadmapStepNote[]>();
    for (const note of notes) {
      if (!includeHiddenNotes && note.visible_to_student !== 1) continue;
      const group = notesByStep.get(note.id_roadmap_step) ?? [];
      group.push(note);
      notesByStep.set(note.id_roadmap_step, group);
    }

    const total = progressRows.length;
    const completed = progressRows.filter((row) => row.status === 'selesai').length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    return {
      id_student_roadmap: studentRoadmap.id_student_roadmap,
      status: studentRoadmap.status,
      started_at: studentRoadmap.started_at,
      completed_at: studentRoadmap.completed_at,
      progress_percent: percent,
      roadmap: this.mapRoadmapTemplate(roadmap),
      steps: roadmap.steps
        .filter((step) => step.is_active === 1)
        .sort((a, b) => a.step_order - b.step_order)
        .map((step) => {
          const enhancedStep = this.enhanceRoadmapStep(roadmap, step);
          return {
          id_roadmap_step: step.id_roadmap_step,
          title: enhancedStep.title,
          description: enhancedStep.description,
          step_order: step.step_order,
          estimated_duration: step.estimated_duration,
          output_target: step.output_target,
          notes: (notesByStep.get(step.id_roadmap_step) ?? []).map((note) => this.mapStepNote(note)),
          details: step.details
            .filter((detail) => detail.is_active === 1)
            .sort((a, b) => a.detail_order - b.detail_order)
            .map((detail) => {
              const progress = progressByDetail.get(detail.id_roadmap_step_detail);
              const enhancedDetail = this.enhanceRoadmapDetail(roadmap, step, detail);
              return {
                id_roadmap_step_detail: detail.id_roadmap_step_detail,
                title: enhancedDetail.title,
                description: enhancedDetail.description,
                reference_link: detail.reference_link,
                reference_type: detail.reference_type,
                detail_order: detail.detail_order,
                progress: progress
                  ? {
                      id_student_roadmap_progress: progress.id_student_roadmap_progress,
                      status: progress.status,
                      progress_note: progress.progress_note,
                      completed_at: progress.completed_at,
                    }
                  : null,
              };
            }),
        };
        }),
    };
  }

  private async refreshStudentRoadmapStatus(studentRoadmapId: number) {
    const [roadmap, rows] = await Promise.all([
      this.studentRoadmapRepo.findOne({ where: { id_student_roadmap: studentRoadmapId } }),
      this.progressRepo.find({ where: { id_student_roadmap: studentRoadmapId } }),
    ]);

    if (!roadmap || rows.length === 0) return;

    const allDone = rows.every((row) => row.status === 'selesai');
    roadmap.status = allDone ? 'selesai' : 'aktif';
    roadmap.completed_at = allDone ? new Date() : null;
    await this.studentRoadmapRepo.save(roadmap);
  }



  private normalizeText(value?: string | null) {
    return String(value ?? '').toLowerCase();
  }

  private getRoadmapFocus(roadmap: RoadmapMaster) {
    const target = roadmap.recommended_for || roadmap.title.replace(/^Roadmap\s+/i, '') || 'bidang pilihan';
    const text = this.normalizeText(`${roadmap.title} ${roadmap.recommended_for} ${roadmap.category}`);

    if (/programmer|developer|informatika|rekayasa perangkat|sistem informasi|rpl/.test(text)) {
      return {
        target,
        tools: 'HTML, CSS, JavaScript/TypeScript, Git, database, dan dasar backend',
        project: 'aplikasi CRUD sederhana dengan autentikasi, validasi form, dan database',
        portfolio: 'repository GitHub, screenshot fitur, dokumentasi cara menjalankan, dan catatan bug yang sudah diperbaiki',
        validation: 'code review dari guru/teman dan demo aplikasi 5 menit',
      };
    }
    if (/data|statistika|analis/.test(text)) {
      return {
        target,
        tools: 'Excel/Spreadsheet, SQL dasar, Python Pandas, visualisasi data, dan interpretasi grafik',
        project: 'analisis dataset kecil berisi pembersihan data, ringkasan statistik, grafik, dan insight rekomendasi',
        portfolio: 'notebook analisis, dashboard sederhana, file data bersih, dan narasi insight',
        validation: 'presentasi insight 3 temuan utama kepada guru/teman',
      };
    }
    if (/cyber|security|keamanan/.test(text)) {
      return {
        target,
        tools: 'dasar jaringan, Linux, keamanan akun, OWASP dasar, dan praktik lab legal',
        project: 'checklist hardening akun/perangkat dan simulasi keamanan web di lab lokal',
        portfolio: 'laporan temuan, bukti konfigurasi aman, dan catatan mitigasi risiko',
        validation: 'review etika, legalitas, dan hasil mitigasi bersama guru',
      };
    }
    if (/ui|ux|dkv|desain|grafis/.test(text)) {
      return {
        target,
        tools: 'riset pengguna, wireframe, Figma/Canva, prinsip warna, tipografi, dan usability testing',
        project: 'prototype 3-5 layar untuk masalah nyata di sekolah/UMKM',
        portfolio: 'case study berisi masalah, persona, wireframe, prototype, dan hasil feedback',
        validation: 'uji coba prototype ke minimal 3 pengguna dan catat perbaikannya',
      };
    }
    if (/digital marketing|marketing|konten|social media/.test(text)) {
      return {
        target,
        tools: 'riset audiens, content pillar, copywriting, desain konten, kalender posting, dan metrik engagement',
        project: 'kampanye konten 7 hari untuk produk/komunitas kecil',
        portfolio: 'kalender konten, contoh desain/caption, hasil metrik, dan evaluasi kampanye',
        validation: 'bandingkan metrik sebelum-sesudah dan minta feedback target audiens',
      };
    }
    if (/akuntansi|keuangan|kasir|perbankan|pajak/.test(text)) {
      return {
        target,
        tools: 'pencatatan transaksi, spreadsheet, laporan kas sederhana, rekonsiliasi, dan etika keuangan',
        project: 'simulasi laporan keuangan sederhana untuk usaha kecil',
        portfolio: 'file spreadsheet, laporan ringkas, bukti rumus, dan analisis kesalahan pencatatan',
        validation: 'cek ulang saldo awal-akhir dan review akurasi laporan',
      };
    }
    if (/farmasi|apoteker|lab|biologi|kimia|kedokteran|keperawatan|gizi|kesehatan/.test(text)) {
      return {
        target,
        tools: 'literasi sains, keselamatan kerja, observasi, pencatatan data, dan komunikasi kesehatan',
        project: 'studi kasus sederhana berbasis literatur/observasi yang aman dan sesuai etika',
        portfolio: 'ringkasan literatur, tabel observasi, kesimpulan, dan refleksi etika',
        validation: 'diskusi hasil dengan guru mapel/guru BK untuk memastikan akurasi',
      };
    }
    if (/otomotif|listrik|elektronik|mekanik|produksi|gudang|logistik|chef|masak/.test(text)) {
      return {
        target,
        tools: 'SOP kerja, alat praktik, keselamatan kerja, troubleshooting, dan dokumentasi proses',
        project: 'praktik mini sesuai bidang dengan checklist K3 dan hasil akhir yang bisa diperiksa',
        portfolio: 'foto proses, checklist alat-bahan, catatan masalah, dan hasil evaluasi praktik',
        validation: 'minta penilaian guru produktif menggunakan rubrik praktik',
      };
    }
    if (/guru|tutor|konselor|psikologi|bk|humas|komunikasi|jurnalistik|hukum|sosiologi/.test(text)) {
      return {
        target,
        tools: 'komunikasi, observasi sosial, penulisan laporan, empati, public speaking, dan etika profesi',
        project: 'simulasi layanan/presentasi/wawancara sederhana sesuai bidang',
        portfolio: 'naskah, rekaman/presentasi, catatan feedback, dan refleksi pengembangan diri',
        validation: 'minta feedback dari guru/teman tentang kejelasan komunikasi dan sikap profesional',
      };
    }

    return {
      target,
      tools: 'konsep dasar bidang, tools pendukung, latihan terarah, dan refleksi belajar',
      project: `proyek mini yang relevan dengan ${target}`,
      portfolio: 'bukti latihan, dokumentasi proses, dan evaluasi hasil',
      validation: 'feedback dari guru/teman serta rencana perbaikan berikutnya',
    };
  }

  private enhanceRoadmapStep(roadmap: RoadmapMaster, step: RoadmapStep) {
    const focus = this.getRoadmapFocus(roadmap);
    const templates: Record<number, { title: string; description: string }> = {
      1: {
        title: `Kenali target ${focus.target}`,
        description: `Pahami tugas nyata, peluang, risiko, dan kompetensi awal yang dibutuhkan untuk masuk ke bidang ${focus.target}.`,
      },
      2: {
        title: `Kuasai fondasi ${focus.target}`,
        description: `Fokus pada ${focus.tools} agar dasar belajarmu sesuai dengan kebutuhan ${focus.target}.`,
      },
      3: {
        title: `Buat proyek mini ${focus.target}`,
        description: `Kerjakan ${focus.project} supaya kemampuanmu terlihat dari hasil nyata, bukan hanya teori.`,
      },
      4: {
        title: `Bangun portofolio ${focus.target}`,
        description: `Kumpulkan ${focus.portfolio} sebagai bukti perkembangan yang bisa ditunjukkan ke guru, kampus, tempat kerja, atau calon pelanggan.`,
      },
      5: {
        title: `Evaluasi kesiapan ${focus.target}`,
        description: `Ukur progres, minta masukan, lalu buat target lanjutan yang lebih spesifik untuk ${focus.target}.`,
      },
    };

    return templates[step.step_order] ?? { title: step.title, description: step.description };
  }

  private enhanceRoadmapDetail(roadmap: RoadmapMaster, step: RoadmapStep, detail: RoadmapStepDetail) {
    const focus = this.getRoadmapFocus(roadmap);
    const odd = detail.detail_order === 1;
    const templates: Record<number, { title: string; description: string }> = {
      1: odd
        ? {
            title: `Riset aktivitas nyata ${focus.target}`,
            description: `Cari 3 contoh aktivitas nyata ${focus.target}, lalu tuliskan tugas harian, tools yang dipakai, dan masalah yang sering diselesaikan.`,
          }
        : {
            title: `Petakan 5 kompetensi ${focus.target}`,
            description: `Buat daftar 5 kompetensi utama ${focus.target}, beri tanda mana yang sudah kamu kuasai dan mana yang perlu dipelajari dulu.`,
          },
      2: odd
        ? {
            title: `Pelajari fondasi utama`,
            description: `Belajar bertahap tentang ${focus.tools}. Catat istilah penting dan contoh penggunaannya dalam bidang ${focus.target}.`,
          }
        : {
            title: `Buat rangkuman dan latihan pendek`,
            description: `Buat rangkuman 1 halaman dan selesaikan latihan kecil yang membuktikan kamu memahami fondasi ${focus.target}.`,
          },
      3: odd
        ? {
            title: `Kerjakan proyek mini`,
            description: `Buat ${focus.project}. Mulai dari versi sederhana, lalu dokumentasikan langkah, kendala, dan hasil akhirnya.`,
          }
        : {
            title: `Minta umpan balik proyek`,
            description: `${focus.validation}. Catat minimal 3 masukan dan tentukan perbaikan yang akan dilakukan.`,
          },
      4: odd
        ? {
            title: `Susun bukti portofolio`,
            description: `Kumpulkan ${focus.portfolio}. Pastikan setiap bukti punya judul, tanggal, tujuan, dan hasil yang jelas.`,
          }
        : {
            title: `Tulis cerita proses`,
            description: `Jelaskan masalah, langkah pengerjaan, tools, hasil, dan hal yang kamu pelajari dari proyek ${focus.target}.`,
          },
      5: odd
        ? {
            title: `Evaluasi progres 30 hari`,
            description: `Bandingkan kemampuan awal dan kemampuan sekarang pada bidang ${focus.target}. Tandai kemampuan yang sudah naik dan yang masih lemah.`,
          }
        : {
            title: `Susun target lanjutan`,
            description: `Tentukan target 30 hari berikutnya yang spesifik, misalnya proyek lanjutan, sertifikasi, latihan wawancara, atau konsultasi guru.`,
          },
    };

    return templates[step.step_order] ?? { title: detail.title, description: detail.description };
  }

  private mapRoadmapTemplate(roadmap: RoadmapMaster) {
    return {
      id_roadmap: roadmap.id_roadmap,
      title: roadmap.title,
      description: roadmap.description,
      category: roadmap.category,
      target_type: roadmap.target_type,
      recommended_for: roadmap.recommended_for,
      is_active: roadmap.is_active,
      steps: roadmap.steps
        ?.filter((step) => step.is_active === 1)
        .sort((a, b) => a.step_order - b.step_order)
        .map((step) => {
          const enhancedStep = this.enhanceRoadmapStep(roadmap, step);
          return {
          id_roadmap_step: step.id_roadmap_step,
          title: enhancedStep.title,
          description: enhancedStep.description,
          step_order: step.step_order,
          estimated_duration: step.estimated_duration,
          output_target: step.output_target,
          details: step.details
            ?.filter((detail) => detail.is_active === 1)
            .sort((a, b) => a.detail_order - b.detail_order)
            .map((detail) => {
              const enhancedDetail = this.enhanceRoadmapDetail(roadmap, step, detail);
              return {
              id_roadmap_step_detail: detail.id_roadmap_step_detail,
              title: enhancedDetail.title,
              description: enhancedDetail.description,
              reference_link: detail.reference_link,
              reference_type: detail.reference_type,
              detail_order: detail.detail_order,
              };
            }) ?? [],
        };
        }) ?? [],
    };
  }

  private mapStepNote(note: RoadmapStepNote) {
    return {
      id_roadmap_step_note: note.id_roadmap_step_note,
      id_roadmap_step: note.id_roadmap_step,
      title: note.title,
      note: note.note,
      follow_up: note.follow_up,
      visible_to_student: note.visible_to_student === 1,
      guru: note.guru
        ? {
            id_guru: note.guru.id_guru,
            nama: note.guru.user?.nama ?? 'Guru',
          }
        : null,
      created_at: note.created_at,
    };
  }
}
