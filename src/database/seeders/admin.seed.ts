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

    if (existingAdmin) {
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);

    const superAdmin = this.userRepo.create({
      nama: 'superadmin',
      email: 'superadmin@skilllens.local',
      no_hp: '-',
      username: 'superadmin',
      password: hashedPassword,
      role: 'superadmin',
    });

    const admin = this.userRepo.create({});

    await this.userRepo.save(superAdmin);

    console.log('Admin default berhasil dibuat');
  }
}
