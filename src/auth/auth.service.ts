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
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Guru)
    private readonly guruRepo: Repository<Guru>,

    private readonly jwtService: JwtService,

    private readonly mailService: MailService,
  ) {}

  private toSafeUser(user: User) {
    return {
      id: user.id_user,
      id_user: user.id_user,
      nama: user.nama,
      email: user.email,
      no_hp: user.no_hp,
      username: user.username,
      role: user.role,
      id_sekolah: user.id_sekolah ?? null,
      must_change_password: user.must_change_password === 1,
    };
  }

  private createToken(user: User) {
    return this.jwtService.sign({
      id: user.id_user,
      id_user: user.id_user,
      role: user.role,
      nama: user.nama,
      username: user.username,
      id_sekolah: user.id_sekolah ?? null,
      must_change_password: user.must_change_password === 1,
    });
  }

  private generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private getOtpExpiredAt() {
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 10);
    return expiredAt;
  }

  private normalizeIdentifier(value: unknown) {
    return String(value ?? '').trim().toLowerCase();
  }

  async login(username: string, password: string) {
    const cleanUsername = String(username ?? '').trim();

    const user = await this.userRepo.findOne({
      where: [{ username: cleanUsername }, { email: cleanUsername }],
    });

    if (!user) {
      throw new UnauthorizedException('Username atau email tidak ditemukan');
    }

    const isMatch = await bcrypt.compare(String(password ?? ''), user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Password tidak sesuai');
    }

    const token = this.createToken(user);

    return {
      message: 'Login berhasil',
      token,
      user: this.toSafeUser(user),
    };
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    return {
      data: this.toSafeUser(user),
    };
  }

  async updateMe(userId: number, body: any) {
    const user = await this.userRepo.findOne({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    const nama = String(body?.nama ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const username = String(body?.username ?? '').trim().toLowerCase();
    const noHp = String(body?.no_hp ?? body?.noHp ?? '').trim();

    if (!nama || !email || !username) {
      throw new BadRequestException('Nama, email, dan username wajib diisi.');
    }

    const emailUsed = await this.userRepo.findOne({
      where: { email },
    });

    if (emailUsed && emailUsed.id_user !== user.id_user) {
      throw new ConflictException('Email sudah digunakan akun lain.');
    }

    const usernameUsed = await this.userRepo.findOne({
      where: { username },
    });

    if (usernameUsed && usernameUsed.id_user !== user.id_user) {
      throw new ConflictException('Username sudah digunakan akun lain.');
    }

    user.nama = nama;
    user.email = email;
    user.username = username;
    user.no_hp = noHp || null;

    const saved = await this.userRepo.save(user);

    return {
      message: 'Profil berhasil diperbarui.',
      token: this.createToken(saved),
      data: this.toSafeUser(saved),
      user: this.toSafeUser(saved),
    };
  }

  async changeDefaultPassword(userId: number, body: any) {
    const user = await this.userRepo.findOne({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    if (user.must_change_password !== 1) {
      return {
        message: 'Password akun ini sudah pernah diganti.',
        token: this.createToken(user),
        user: this.toSafeUser(user),
      };
    }

    const currentPassword = String(
      body?.current_password ?? body?.currentPassword ?? '',
    );

    const newPassword = String(body?.new_password ?? body?.newPassword ?? '');

    const confirmPassword = String(
      body?.confirm_password ??
        body?.password_confirmation ??
        body?.passwordConfirmation ??
        '',
    );

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new BadRequestException(
        'Password lama, password baru, dan konfirmasi password wajib diisi.',
      );
    }

    const validOldPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validOldPassword) {
      throw new BadRequestException(
        'Password lama/default tidak sesuai. Gunakan NIP untuk guru atau NISN untuk siswa.',
      );
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter.');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Konfirmasi password baru tidak sesuai.');
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);

    if (sameAsOld) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password default.',
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.must_change_password = 0;

    const saved = await this.userRepo.save(user);

    return {
      message: 'Password berhasil diganti. Silakan lanjut ke dashboard.',
      token: this.createToken(saved),
      user: this.toSafeUser(saved),
    };
  }

  async requestForgotPasswordOtp(body: any) {
    const identifier = this.normalizeIdentifier(
      body?.identifier ?? body?.username ?? body?.email,
    );

    if (!identifier) {
      throw new BadRequestException('Username atau email wajib diisi.');
    }

    const user = await this.userRepo.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      throw new BadRequestException('Akun tidak ditemukan.');
    }

    if (!user.email) {
      throw new BadRequestException(
        'Akun ini belum memiliki email. Hubungi admin untuk reset password.',
      );
    }

    const otp = this.generateOtp();

    user.password_reset_otp = otp;
    user.password_reset_otp_expires_at = this.getOtpExpiredAt();

    await this.userRepo.save(user);

    await this.mailService.sendOtpEmail({
      to: user.email,
      name: user.nama,
      otp,
      purpose: 'forgot-password',
    });

    console.log(
      `[FORGOT PASSWORD OTP] user=${user.username} email=${user.email} otp=${otp}`,
    );

    return {
      message: `Kode OTP berhasil dikirim ke email ${user.email}.`,
      expires_in_minutes: 10,
      dev_otp: process.env.NODE_ENV === 'production' ? undefined : otp,
    };
  }

  async resetForgotPassword(body: any) {
    const identifier = this.normalizeIdentifier(
      body?.identifier ?? body?.username ?? body?.email,
    );

    const otp = String(body?.otp ?? '').trim();

    const newPassword = String(body?.new_password ?? body?.newPassword ?? '');

    const confirmPassword = String(
      body?.confirm_password ??
        body?.password_confirmation ??
        body?.passwordConfirmation ??
        '',
    );

    if (!identifier || !otp || !newPassword || !confirmPassword) {
      throw new BadRequestException(
        'Username/email, OTP, password baru, dan konfirmasi password wajib diisi.',
      );
    }

    const user = await this.userRepo.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      throw new BadRequestException('Akun tidak ditemukan.');
    }

    if (!user.password_reset_otp || !user.password_reset_otp_expires_at) {
      throw new BadRequestException('OTP belum diminta atau sudah tidak valid.');
    }

    const now = new Date();

    if (now > user.password_reset_otp_expires_at) {
      user.password_reset_otp = null;
      user.password_reset_otp_expires_at = null;
      await this.userRepo.save(user);

      throw new BadRequestException('OTP sudah kedaluwarsa. Minta OTP baru.');
    }

    if (user.password_reset_otp !== otp) {
      throw new BadRequestException('Kode OTP tidak sesuai.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter.');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Konfirmasi password baru tidak sesuai.');
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);

    if (sameAsOld) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password lama/default.',
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.must_change_password = 0;
    user.password_reset_otp = null;
    user.password_reset_otp_expires_at = null;

    await this.userRepo.save(user);

    return {
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    };
  }

  async requestPasswordOtp(userId: number, body: any) {
    const user = await this.userRepo.findOne({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    if (!user.email) {
      throw new BadRequestException(
        'Akun ini belum memiliki email. Tambahkan email terlebih dahulu.',
      );
    }

    const currentPassword = String(
      body?.current_password ?? body?.currentPassword ?? '',
    );

    if (!currentPassword) {
      throw new BadRequestException('Password lama wajib diisi untuk meminta OTP.');
    }

    const validOldPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validOldPassword) {
      throw new BadRequestException('Password lama tidak sesuai.');
    }

    const otp = this.generateOtp();

    user.password_reset_otp = otp;
    user.password_reset_otp_expires_at = this.getOtpExpiredAt();

    await this.userRepo.save(user);

    await this.mailService.sendOtpEmail({
      to: user.email,
      name: user.nama,
      otp,
      purpose: 'change-password',
    });

    console.log(
      `[PROFILE PASSWORD OTP] user=${user.username} email=${user.email} otp=${otp}`,
    );

    return {
      message: `Kode OTP berhasil dikirim ke email ${user.email}.`,
      expires_in_minutes: 10,
      dev_otp: process.env.NODE_ENV === 'production' ? undefined : otp,
    };
  }

  async changePasswordWithOtp(userId: number, body: any) {
    const user = await this.userRepo.findOne({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    const currentPassword = String(
      body?.current_password ?? body?.currentPassword ?? '',
    );

    const otp = String(body?.otp ?? '').trim();

    const newPassword = String(body?.new_password ?? body?.newPassword ?? '');

    const confirmPassword = String(
      body?.confirm_password ??
        body?.password_confirmation ??
        body?.passwordConfirmation ??
        '',
    );

    if (!currentPassword || !otp || !newPassword || !confirmPassword) {
      throw new BadRequestException(
        'Password lama, OTP, password baru, dan konfirmasi password wajib diisi.',
      );
    }

    const validOldPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validOldPassword) {
      throw new BadRequestException('Password lama tidak sesuai.');
    }

    if (!user.password_reset_otp || !user.password_reset_otp_expires_at) {
      throw new BadRequestException('OTP belum diminta atau sudah tidak valid.');
    }

    const now = new Date();

    if (now > user.password_reset_otp_expires_at) {
      user.password_reset_otp = null;
      user.password_reset_otp_expires_at = null;
      await this.userRepo.save(user);

      throw new BadRequestException('OTP sudah kedaluwarsa. Minta OTP baru.');
    }

    if (user.password_reset_otp !== otp) {
      throw new BadRequestException('Kode OTP tidak sesuai.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter.');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Konfirmasi password baru tidak sesuai.');
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);

    if (sameAsOld) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password lama.',
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.must_change_password = 0;
    user.password_reset_otp = null;
    user.password_reset_otp_expires_at = null;

    await this.userRepo.save(user);

    return {
      message: 'Password berhasil diperbarui dengan OTP.',
    };
  }

  async changePassword(userId: number, body: any) {
    const user = await this.userRepo.findOne({
      where: { id_user: Number(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan.');
    }

    const currentPassword = String(
      body?.current_password ?? body?.currentPassword ?? '',
    );

    const newPassword = String(body?.new_password ?? body?.newPassword ?? '');

    const confirmPassword = String(
      body?.confirm_password ??
        body?.password_confirmation ??
        body?.passwordConfirmation ??
        '',
    );

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new BadRequestException(
        'Password lama, password baru, dan konfirmasi password wajib diisi.',
      );
    }

    const validOldPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validOldPassword) {
      throw new BadRequestException('Password lama tidak sesuai.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter.');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Konfirmasi password baru tidak sesuai.');
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);

    if (sameAsOld) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password lama.',
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.must_change_password = 0;

    await this.userRepo.save(user);

    return {
      message: 'Password berhasil diperbarui.',
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