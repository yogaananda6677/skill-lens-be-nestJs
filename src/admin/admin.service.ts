import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
  ) {}

  async dashboard() {
    const [schools, pendingSchools, teachers, students] = await Promise.all([
      this.sekolahRepo.count(),
      this.sekolahRepo.count({
        where: { status_verifikasi: 'pending' },
      }),
      this.userRepo.count({
        where: { role: 'guru' },
      }),
      this.siswaRepo.count(),
    ]);

    return {
      stats: {
        schools,
        pendingSchools,
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
    }));
  }

  async schools() {
    const rows = await this.sekolahRepo.find({
      order: { nama_sekolah: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id_sekolah,
      name: row.nama_sekolah,
      level: row.jenis_sekolah ?? '-',
      status: row.status_verifikasi,
      address: row.alamat ?? '-',
      phone: row.no_hp_sekolah ?? '-',
    }));
  }

  async verifikasiSekolah(id: number) {
    const sekolah = await this.sekolahRepo.findOne({
      where: { id_sekolah: id },
    });

    if (!sekolah) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    sekolah.status_verifikasi = 'approved';

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
}