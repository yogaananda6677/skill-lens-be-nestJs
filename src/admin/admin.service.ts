import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';

import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { User } from '../user/entities/user.entity';
import { Siswa } from '../siswa/entities/siswa.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Sekolah)
    private readonly sekolahRepo: Repository<Sekolah>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,

    private readonly dataSource: DataSource,
  ) {}



  private async ensureAppSettingsTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
        setting_value TEXT NULL,
        description TEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }

  async getRoadmapCountSetting() {
    // Rekomendasi SPK dikunci 3 agar hasil siswa tetap mudah dibandingkan.
    return 3;
  }

  async updateRoadmapCount(value: any) {
    await this.ensureAppSettingsTable();
    await this.dataSource.query(
      `INSERT INTO app_settings (setting_key, setting_value, description)
       VALUES ('recommendation_top_n', '3', 'Jumlah rekomendasi SPK dikunci tiga pilihan utama')
       ON DUPLICATE KEY UPDATE setting_value = '3', updated_at = CURRENT_TIMESTAMP`,
    );
    return { message: 'Jumlah rekomendasi SPK tetap 3 pilihan utama.', data: { recommendation_top_n: 3 } };
  }

  async getRoadmapStepLimitSetting() {
    await this.ensureAppSettingsTable();
    const rows = await this.dataSource.query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'roadmap_step_limit' LIMIT 1`,
    );
    const value = Number(rows?.[0]?.setting_value ?? 4);
    return Number.isFinite(value) ? Math.min(Math.max(Math.floor(value), 1), 12) : 4;
  }

  async updateRoadmapStepLimit(value: any) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) {
      throw new NotFoundException('Jumlah tahap roadmap tidak valid.');
    }

    const count = Math.min(Math.max(Math.floor(raw), 1), 12);
    await this.ensureAppSettingsTable();
    await this.dataSource.query(
      `INSERT INTO app_settings (setting_key, setting_value, description)
       VALUES ('roadmap_step_limit', ?, 'Jumlah tahap roadmap yang diberikan kepada siswa saat membuat roadmap')
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [String(count)],
    );

    return { message: 'Jumlah tahap roadmap berhasil diperbarui.', data: { roadmap_step_limit: count } };
  }

  async dashboard() {
    const [schools, pendingSchools, rejectedSchools, teachers, students, roadmapCount, roadmapStepLimit] = await Promise.all([
      this.sekolahRepo.count(),
      this.sekolahRepo.count({ where: { status_verifikasi: 'pending' } }),
      this.sekolahRepo.count({ where: { status_verifikasi: 'rejected' as any } }),
      this.userRepo.count({ where: { role: 'guru' } }),
      this.siswaRepo.count(),
      this.getRoadmapCountSetting(),
      this.getRoadmapStepLimitSetting(),
    ]);

    return {
      stats: {
        schools,
        pendingSchools,
        rejectedSchools,
        roadmapCount,
        roadmapStepLimit,
        teachers,
        students,
      },
      activities: [
        {
          title: 'Database aktif',
          text: 'Dashboard membaca data sekolah, guru, dan siswa dari backend.',
          tone: 'info',
        },
        {
          title: 'Verifikasi sekolah',
          text: `${pendingSchools} sekolah menunggu verifikasi.`,
          tone: pendingSchools ? 'warning' : 'success',
        },
      ],
    };
  }

  async verifications() {
    const rows = await this.sekolahRepo.find({
      where: { status_verifikasi: Not('approved') },
      order: { id_sekolah: 'DESC' },
    });

    return rows.map((row) => ({
      id: row.id_sekolah,
      school: row.nama_sekolah,
      level: row.jenis_sekolah ?? '-',
      city: row.alamat?.split(',').pop()?.trim() ?? '-',
      status: row.status_verifikasi,
      address: row.alamat ?? '-',
      phone: row.no_hp_sekolah ?? '-',
      npsn: row.npsn ?? null,
      rejection_reason: row.rejection_reason ?? null,
    }));
  }

  async schools() {
    const rows = await this.sekolahRepo.find({
      order: { nama_sekolah: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id_sekolah,
      name: row.nama_sekolah,
      npsn: row.npsn ?? '-',
      level: row.jenis_sekolah ?? '-',
      status: row.status_verifikasi,
      address: row.alamat ?? '-',
      phone: row.no_hp_sekolah ?? '-',
    }));
  }


  async deleteSchool(id: number) {
    const sekolah = await this.sekolahRepo.findOne({ where: { id_sekolah: id } });
    if (!sekolah) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    try {
      await this.sekolahRepo.delete(id);
      return { message: 'Sekolah berhasil dihapus.', data: { id } };
    } catch {
      throw new BadRequestException('Sekolah tidak bisa dihapus karena masih terhubung dengan data guru atau siswa.');
    }
  }

  async verifikasiSekolah(id: number) {
    const sekolah = await this.sekolahRepo.findOne({
      where: { id_sekolah: id },
    });

    if (!sekolah) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    sekolah.status_verifikasi = 'approved';
    sekolah.rejection_reason = null;

    const savedSekolah = await this.sekolahRepo.save(sekolah);

    return {
      message: 'Sekolah berhasil diverifikasi.',
      data: {
        id: savedSekolah.id_sekolah,
        name: savedSekolah.nama_sekolah,
        status: savedSekolah.status_verifikasi,
      },
    };
  }

  async tolakSekolah(id: number, reasonValue: any) {
    const reason = String(reasonValue ?? '').trim();
    if (!reason) {
      throw new NotFoundException('Alasan penolakan wajib diisi.');
    }

    const sekolah = await this.sekolahRepo.findOne({ where: { id_sekolah: id } });
    if (!sekolah) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    sekolah.status_verifikasi = 'rejected' as any;
    sekolah.rejection_reason = reason;
    const savedSekolah = await this.sekolahRepo.save(sekolah);

    return {
      message: 'Pengajuan sekolah berhasil ditolak.',
      data: {
        id: savedSekolah.id_sekolah,
        name: savedSekolah.nama_sekolah,
        status: savedSekolah.status_verifikasi,
        rejection_reason: savedSekolah.rejection_reason,
      },
    };
  }
}
