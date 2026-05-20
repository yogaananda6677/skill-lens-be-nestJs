import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../user/entities/user.entity';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
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
        must_change_password: 1,
      }),
    );

    console.log('Superadmin default berhasil dibuat: superadmin / admin123');
  }
}
