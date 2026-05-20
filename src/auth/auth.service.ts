import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from '../user/entities/user.entity';
import { Guru } from '../guru/entities/guru.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Guru)
    private readonly guruRepo: Repository<Guru>,

    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({
      where: [{ username }, { email: username }],
    });

    if (!user) {
      throw new UnauthorizedException('Username atau email tidak ditemukan');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Password tidak sesuai');
    }

    const token = this.jwtService.sign({
      id: user.id_user,
      role: user.role,
      nama: user.nama,
      username: user.username,
      id_sekolah: user.id_sekolah,
      must_change_password: user.must_change_password === 1,
    });

    return {
      message: 'Login berhasil',
      token,
      user: {
        id: user.id_user,
        nama: user.nama,
        email: user.email,
        username: user.username,
        role: user.role,
        id_sekolah: user.id_sekolah,
        must_change_password: user.must_change_password === 1,
      },
    };
  }

  async checkAvailability(username?: string, email?: string) {
  const cleanUsername = String(username ?? '').trim().toLowerCase();
  const cleanEmail = String(email ?? '').trim().toLowerCase();

  const response = {
    username_available: true,
    email_available: true,
  };

  if (cleanUsername) {
    const userByUsername = await this.userRepo.findOne({
      where: { username: cleanUsername },
    });

    response.username_available = !userByUsername;
  }

  if (cleanEmail) {
    const userByEmail = await this.userRepo.findOne({
      where: { email: cleanEmail },
    });

    response.email_available = !userByEmail;
  }

  return response;
}

  async registerAdminSekolah(body: any) {
    const nama = String(body?.nama ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const username = String(body?.username ?? '').trim().toLowerCase();
    const noHp = String(body?.no_hp ?? body?.noHp ?? '').trim();
    const password = String(body?.password ?? '');
    const passwordConfirmation = String(
      body?.password_confirmation ?? body?.passwordConfirmation ?? '',
    );

    if (!nama || !email || !username || !noHp || !password) {
      throw new BadRequestException(
        'Nama, email, nomor HP, username, dan password wajib diisi.',
      );
    }

    if (password.length < 8) {
      throw new BadRequestException('Password minimal 8 karakter.');
    }

    if (passwordConfirmation && password !== passwordConfirmation) {
      throw new BadRequestException('Konfirmasi password tidak sesuai.');
    }

    const existing = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existing) {
      throw new ConflictException('Email atau username sudah digunakan.');
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        nama,
        email,
        username,
        no_hp: noHp,
        password: await bcrypt.hash(password, 12),
        role: 'admin_sekolah',
        id_sekolah: null,
        must_change_password: 0,
      }),
    );

    return {
      message:
        'Akun admin sekolah berhasil dibuat. Silakan login dan hubungkan akun dengan sekolah.',
      data: {
        id_user: user.id_user,
        nama: user.nama,
        email: user.email,
        username: user.username,
        role: user.role,
        id_sekolah: user.id_sekolah,
        status_sekolah: 'belum_terhubung',
      },
    };
  }

  async registerGuru(body: any) {
    const nama = String(body?.nama ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const username = String(body?.username ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const nip = String(body?.nip ?? '').trim();
    const noHp = String(body?.no_hp ?? body?.noHp ?? '').trim();
    const jabatan = String(body?.jabatan ?? 'Guru').trim();

    if (!nama || !email || !username || !password || !nip) {
      throw new BadRequestException(
        'Nama, email, username, password, dan NIP/NUPTK wajib diisi.',
      );
    }

    if (password.length < 8) {
      throw new BadRequestException('Password minimal 8 karakter.');
    }

    const existing = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existing) {
      throw new ConflictException('Email atau username sudah digunakan.');
    }

    const existingGuru = await this.guruRepo.findOne({
      where: { nip },
    });

    if (existingGuru) {
      throw new ConflictException('NIP/NUPTK sudah terdaftar.');
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        nama,
        email,
        username,
        no_hp: noHp || null,
        password: await bcrypt.hash(password, 12),
        role: 'guru',
        id_sekolah: null,
        must_change_password: 0,
      }),
    );

    const guru = await this.guruRepo.save(
      this.guruRepo.create({
        nip,
        jabatan,
        id_sekolah: null,
        sekolah: null,
        user,
      }),
    );

    return {
      message:
        'Akun guru berhasil dibuat. Silakan login dan lengkapi data sekolah.',
      data: {
        id_user: user.id_user,
        id_guru: guru.id_guru,
        nama: user.nama,
        email: user.email,
        username: user.username,
        role: user.role,
        status_sekolah: 'belum_diajukan',
      },
    };
  }
}