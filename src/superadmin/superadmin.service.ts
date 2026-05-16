import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../user/entities/user.entity';

@Injectable()
export class SuperadminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getAdmins() {
    const admins = await this.userRepo.find({
      where: { role: 'admin' },
      order: { id_user: 'DESC' },
    });

    return admins.map((admin) => ({
      id_user: admin.id_user,
      nama: admin.nama,
      email: admin.email,
      username: admin.username,
      no_hp: admin.no_hp,
      role: admin.role,
    }));
  }

  async createAdmin(body: any) {
    const nama = String(body?.nama ?? '').trim();
    const email = String(body?.email ?? '')
      .trim()
      .toLowerCase();
    const username = String(body?.username ?? '')
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? '').trim();
    const noHp = body?.no_hp ? String(body.no_hp).trim() : null;

    if (!nama || !email || !username || !password) {
      throw new BadRequestException(
        'Nama, email, username, dan password wajib diisi.',
      );
    }

    const existing = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existing) {
      throw new ConflictException('Email atau username sudah digunakan.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = this.userRepo.create({
      nama,
      email,
      username,
      no_hp: noHp,
      password: hashedPassword,
      role: 'admin',
    });

    const savedAdmin = await this.userRepo.save(admin);

    return {
      message: 'Admin berhasil dibuat.',
      data: {
        id_user: savedAdmin.id_user,
        nama: savedAdmin.nama,
        email: savedAdmin.email,
        username: savedAdmin.username,
        no_hp: savedAdmin.no_hp,
        role: savedAdmin.role,
      },
    };
  }

  async updateAdmin(id: number, body: any) {
    const admin = await this.userRepo.findOne({
      where: { id_user: id },
    });

    if (!admin) {
      throw new NotFoundException('Admin tidak ditemukan.');
    }

    if (admin.role !== 'admin') {
      throw new BadRequestException('Akun ini bukan admin.');
    }

    const email = body?.email
      ? String(body.email).trim().toLowerCase()
      : undefined;
    const username = body?.username
      ? String(body.username).trim().toLowerCase()
      : undefined;

    if (email) {
      const existingEmail = await this.userRepo.findOne({
        where: { email, id_user: Not(id) },
      });

      if (existingEmail) {
        throw new ConflictException('Email sudah digunakan.');
      }

      admin.email = email;
    }

    if (username) {
      const existingUsername = await this.userRepo.findOne({
        where: { username, id_user: Not(id) },
      });

      if (existingUsername) {
        throw new ConflictException('Username sudah digunakan.');
      }

      admin.username = username;
    }

    if (body?.nama) {
      admin.nama = String(body.nama).trim();
    }

    if (body?.no_hp !== undefined) {
      admin.no_hp = body.no_hp ? String(body.no_hp).trim() : null;
    }

    if (body?.password) {
      admin.password = await bcrypt.hash(String(body.password), 12);
    }

    const savedAdmin = await this.userRepo.save(admin);

    return {
      message: 'Admin berhasil diperbarui.',
      data: {
        id_user: savedAdmin.id_user,
        nama: savedAdmin.nama,
        email: savedAdmin.email,
        username: savedAdmin.username,
        no_hp: savedAdmin.no_hp,
        role: savedAdmin.role,
      },
    };
  }

  async deleteAdmin(id: number) {
    const admin = await this.userRepo.findOne({
      where: { id_user: id },
    });

    if (!admin) {
      throw new NotFoundException('Admin tidak ditemukan.');
    }

    if (admin.role !== 'admin') {
      throw new BadRequestException(
        'Hanya akun admin yang boleh dihapus dari menu ini.',
      );
    }

    await this.userRepo.remove(admin);

    return {
      message: 'Admin berhasil dihapus.',
    };
  }
}
