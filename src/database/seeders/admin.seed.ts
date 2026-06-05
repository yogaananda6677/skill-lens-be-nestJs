import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../user/entities/user.entity';
import { Semester } from '../../semester/entities/semester.entity';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Semester)
    private readonly semesterRepo: Repository<Semester>,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
    await this.seedSemester();
  }

  private async seedSuperAdmin() {
    const existingAdmin = await this.userRepo.findOne({
      where: { username: 'superadmin' },
    });

    if (existingAdmin) return;

    const hashedPassword = await bcrypt.hash('admin123', 12);

    await this.userRepo.save(
      this.userRepo.create({
        nama: 'Super Admin SkillLens',
        email: 'superadmin@skilllens.local',
        no_hp: '-',
        username: 'superadmin',
        password: hashedPassword,
        role: 'superadmin',
        id_sekolah: null,
        must_change_password: 0,
      }),
    );

    console.log('Superadmin default berhasil dibuat: superadmin / admin123');
  }

  private async seedSemester() {
    const semesterList = [1, 2, 3, 4, 5, 6];

    let created = 0;
    let skipped = 0;

    for (const nomorSemester of semesterList) {
      const namaSemester = `Semester ${nomorSemester}`;

      const existingSemester = await this.semesterRepo.findOne({
        where: {
          nama_semester: namaSemester,
        },
      });

      if (existingSemester) {
        skipped += 1;
        continue;
      }

      await this.semesterRepo.save(
        this.semesterRepo.create({
          nama_semester: namaSemester,
        }),
      );

      created += 1;
    }

    console.log(
      `Seeder semester selesai. Dibuat: ${created}, sudah ada: ${skipped}`,
    );
  }
}