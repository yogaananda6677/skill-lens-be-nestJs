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
        .map((step) => ({
          id_roadmap_step: step.id_roadmap_step,
          title: step.title,
          description: step.description,
          step_order: step.step_order,
          estimated_duration: step.estimated_duration,
          output_target: step.output_target,
          notes: (notesByStep.get(step.id_roadmap_step) ?? []).map((note) => this.mapStepNote(note)),
          details: step.details
            .filter((detail) => detail.is_active === 1)
            .sort((a, b) => a.detail_order - b.detail_order)
            .map((detail) => {
              const progress = progressByDetail.get(detail.id_roadmap_step_detail);
              return {
                id_roadmap_step_detail: detail.id_roadmap_step_detail,
                title: detail.title,
                description: detail.description,
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
        })),
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
        .map((step) => ({
          id_roadmap_step: step.id_roadmap_step,
          title: step.title,
          description: step.description,
          step_order: step.step_order,
          estimated_duration: step.estimated_duration,
          output_target: step.output_target,
          details: step.details
            ?.filter((detail) => detail.is_active === 1)
            .sort((a, b) => a.detail_order - b.detail_order)
            .map((detail) => ({
              id_roadmap_step_detail: detail.id_roadmap_step_detail,
              title: detail.title,
              description: detail.description,
              reference_link: detail.reference_link,
              reference_type: detail.reference_type,
              detail_order: detail.detail_order,
            })) ?? [],
        })) ?? [],
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
