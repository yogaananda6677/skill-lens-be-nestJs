import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../user/entities/user.entity';
import { Guru } from '../guru/entities/guru.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { CreateAdminSchoolDto } from './dto/create-admin-school.dto';
import { CreateAdminTeacherDto } from './dto/create-admin-teacher.dto';
import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { Like } from 'typeorm';

type SchoolStatus = 'none' | 'pending' | 'approved';

@Injectable()
export class AdminSekolahService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Guru)
    private readonly guruRepo: Repository<Guru>,

    @InjectRepository(Sekolah)
    private readonly sekolahRepo: Repository<Sekolah>,

    @InjectRepository(Jurusan)
    private readonly jurusanRepo: Repository<Jurusan>,

    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,
  ) {}

  private clean(value?: string | null) {
    return String(value ?? '').trim();
  }

  private cleanLower(value?: string | null) {
    return this.clean(value).toLowerCase();
  }

  private normalizePhone(value?: string | null) {
    return this.clean(value).replace(/[\s\-().]/g, '');
  }


  async listSiswa(userId: number, query: any) {
  const sekolah = await this.getApprovedSchoolOrFail(userId);

  const page = Math.max(Number(query?.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query?.limit ?? 10), 1), 100);
  const skip = (page - 1) * limit;

  const keyword = this.clean(query?.keyword);
  const idJurusan = Number(query?.id_jurusan ?? 0);
  const tahunAjaran = this.clean(query?.tahun_ajaran);

  const qb = this.siswaRepo
    .createQueryBuilder('siswa')
    .leftJoinAndSelect('siswa.user', 'user')
    .leftJoinAndSelect('siswa.jurusan_detail', 'jurusan')
    .where('siswa.id_sekolah = :idSekolah', {
      idSekolah: sekolah.id_sekolah,
    });

  if (keyword) {
    qb.andWhere(
      '(siswa.nisn LIKE :keyword OR user.nama LIKE :keyword OR user.username LIKE :keyword)',
      { keyword: `%${keyword}%` },
    );
  }

  if (idJurusan) {
    qb.andWhere('siswa.id_jurusan = :idJurusan', { idJurusan });
  }

  /**
   * Catatan:
   * Entity siswa kamu belum punya kolom tahun_ajaran.
   * Tahun ajaran sebenarnya tersimpan di tabel semester/kurikulum/nilai.
   * Jadi filter tahun ajaran di list siswa belum bisa akurat kecuali kamu tambah kolom tahun_ajaran di siswa.
   */
  if (tahunAjaran) {
    // sementara tidak difilter dulu agar tidak error kolom.
  }

  const [rows, total] = await qb
    .orderBy('siswa.id_siswa', 'DESC')
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  return {
    message: 'Data siswa berhasil dimuat.',
    total,
    page,
    limit,
    data: rows.map((siswa) => ({
      id: siswa.id_siswa,
      id_siswa: siswa.id_siswa,
      nisn: siswa.nisn,
      nama: siswa.user?.nama ?? '-',
      username: siswa.user?.username ?? '-',
       password_awal: siswa.nisn,
      kelas: siswa.kelas,
      jurusan: siswa.jurusan_detail?.nama_jurusan || siswa.jurusan || '-',
      id_jurusan: siswa.id_jurusan,
      status: 'Aktif',
    })),
  };
}

  private async getAdminOrFail(userId: number) {
    const admin = await this.userRepo.findOne({
      where: { id_user: userId },
    });

    if (!admin) {
      throw new NotFoundException('Akun admin sekolah tidak ditemukan.');
    }

    if (admin.role !== 'admin_sekolah') {
      throw new ForbiddenException('Akses hanya untuk admin sekolah.');
    }

    return admin;
  }

  private async getSchoolByAdmin(admin: User) {
    if (!admin.id_sekolah) return null;

    return this.sekolahRepo.findOne({
      where: { id_sekolah: admin.id_sekolah },
    });
  }

  private validateSchoolDto(dto: CreateAdminSchoolDto) {
    const namaSekolah = this.clean(dto.nama_sekolah);
    const npsn = this.clean(dto.npsn);
    const jenisSekolah = this.clean(dto.jenis_sekolah).toUpperCase();
    const noTelp = this.normalizePhone(dto.no_telp);

    if (!namaSekolah) {
      throw new BadRequestException('Nama sekolah wajib diisi.');
    }

    if (namaSekolah.length < 3) {
      throw new BadRequestException('Nama sekolah minimal 3 karakter.');
    }

    if (!['SMA', 'SMK'].includes(jenisSekolah)) {
      throw new BadRequestException('Jenis sekolah hanya boleh SMA atau SMK.');
    }

    if (npsn && !/^[0-9]{8}$/.test(npsn)) {
      throw new BadRequestException('NPSN harus berupa 8 digit angka.');
    }

    if (noTelp) {
      const digitOnly = noTelp.replace(/^\+/, '');

      if (!/^[0-9+]+$/.test(noTelp)) {
        throw new BadRequestException(
          'Nomor telepon hanya boleh angka atau tanda +.',
        );
      }

      if (digitOnly.length < 6 || digitOnly.length > 15) {
        throw new BadRequestException(
          'Nomor telepon sekolah harus 6 sampai 15 digit.',
        );
      }
    }
  }

  private validateTeacherDto(dto: CreateAdminTeacherDto) {
    const nama = this.clean(dto.nama);
    const email = this.cleanLower(dto.email);
    const username = this.cleanLower(dto.username);
    const nip = this.clean(dto.nip);
    const noHp = this.normalizePhone(dto.no_hp);

    if (!nama) {
      throw new BadRequestException('Nama guru wajib diisi.');
    }

    if (nama.length < 3) {
      throw new BadRequestException('Nama guru minimal 3 karakter.');
    }

    if (!/^[A-Za-zÀ-ÿ\s.'-]+$/.test(nama)) {
      throw new BadRequestException(
        'Nama guru hanya boleh berisi huruf, spasi, titik, petik, atau tanda hubung.',
      );
    }

    if (!email) {
      throw new BadRequestException('Email guru wajib diisi.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new BadRequestException('Format email guru tidak valid.');
    }

    if (!username) {
      throw new BadRequestException('Username guru wajib diisi.');
    }

    if (username.length < 5) {
      throw new BadRequestException('Username minimal 5 karakter.');
    }

    if (!/^[a-z]/.test(username)) {
      throw new BadRequestException('Username harus diawali huruf.');
    }

    if (!/[0-9]/.test(username)) {
      throw new BadRequestException(
        'Username guru wajib memiliki minimal 1 angka.',
      );
    }

    if (!/^[a-z0-9._]+$/.test(username)) {
      throw new BadRequestException(
        'Username hanya boleh huruf kecil, angka, titik, dan underscore.',
      );
    }

    if (!nip) {
      throw new BadRequestException('NIP/NUPTK wajib diisi.');
    }

    if (nip.length < 5) {
      throw new BadRequestException('NIP/NUPTK minimal 5 karakter.');
    }

    if (!/^[0-9]+$/.test(nip)) {
      throw new BadRequestException('NIP/NUPTK hanya boleh angka.');
    }

    if (noHp) {
      const digitOnly = noHp.replace(/^\+/, '');

      if (!/^(\+62|62|08)[0-9]+$/.test(noHp)) {
        throw new BadRequestException(
          'Nomor HP harus diawali 08, 62, atau +62.',
        );
      }

      if (digitOnly.length < 10 || digitOnly.length > 15) {
        throw new BadRequestException('Nomor HP harus 10 sampai 15 digit.');
      }
    }

    const validJabatan = [
      'Guru BK',
      'Wali Kelas',
      'Kepala Program Keahlian',
      'Guru Mata Pelajaran',
    ];

    if (!validJabatan.includes(dto.jabatan)) {
      throw new BadRequestException('Jabatan guru tidak valid.');
    }
  }

  async getStatus(userId: number) {
    const admin = await this.getAdminOrFail(userId);
    const sekolah = await this.getSchoolByAdmin(admin);

    if (!sekolah) {
      return {
        has_school: false,
        school_status: 'none' as SchoolStatus,
        id_sekolah: null,
        nama_sekolah: null,
        message: 'Admin sekolah belum mengajukan data sekolah.',
      };
    }

    const status = (sekolah.status_verifikasi ?? 'pending') as SchoolStatus;

    return {
      has_school: true,
      school_status: status,
      id_sekolah: sekolah.id_sekolah,
      nama_sekolah: sekolah.nama_sekolah,
      message:
        status === 'approved'
          ? 'Sekolah sudah diverifikasi. Fitur guru dan import siswa sudah aktif.'
          : 'Pengajuan sekolah menunggu verifikasi superadmin.',
    };
  }

  async createOrUpdateSchool(userId: number, dto: CreateAdminSchoolDto) {
    this.validateSchoolDto(dto);

    const admin = await this.getAdminOrFail(userId);
    const currentSchool = await this.getSchoolByAdmin(admin);

    if (currentSchool?.status_verifikasi === 'approved') {
      throw new ConflictException(
        'Sekolah sudah diverifikasi dan tidak bisa diajukan ulang.',
      );
    }

    if (currentSchool?.status_verifikasi === 'pending') {
      throw new ConflictException(
        'Pengajuan sekolah masih menunggu verifikasi superadmin.',
      );
    }

    const npsn = this.clean(dto.npsn);

    if (npsn) {
      const duplicateNpsn = await this.sekolahRepo.findOne({
        where: { npsn },
      });

      if (duplicateNpsn) {
        throw new ConflictException('NPSN sudah digunakan oleh sekolah lain.');
      }
    }

    const jenisSekolah = this.clean(dto.jenis_sekolah).toUpperCase() as
      | 'SMA'
      | 'SMK';

        const sekolahData = this.sekolahRepo.create({
        nama_sekolah: this.clean(dto.nama_sekolah),
        npsn: npsn || null,
        alamat: this.clean(dto.alamat) || null,
        no_hp_sekolah: this.normalizePhone(dto.no_telp) || null,
        jenis_sekolah: jenisSekolah,
        status_verifikasi: 'pending',
        });

        const sekolah = await this.sekolahRepo.save(sekolahData);

    admin.id_sekolah = sekolah.id_sekolah;
    await this.userRepo.save(admin);

    return {
      message:
        'Pengajuan sekolah berhasil dikirim. Fitur guru dan import siswa akan aktif setelah sekolah disetujui.',
      data: {
        id_sekolah: sekolah.id_sekolah,
        nama_sekolah: sekolah.nama_sekolah,
        status_verifikasi: sekolah.status_verifikasi,
      },
    };
  }

  async getApprovedSchoolOrFail(userId: number) {
    const admin = await this.getAdminOrFail(userId);
    const sekolah = await this.getSchoolByAdmin(admin);

    if (!sekolah) {
      throw new BadRequestException(
        'Ajukan data sekolah terlebih dahulu sebelum menggunakan fitur ini.',
      );
    }

    if (sekolah.status_verifikasi !== 'approved') {
      throw new BadRequestException(
        'Sekolah belum diverifikasi. Fitur ini akan terbuka setelah sekolah disetujui superadmin.',
      );
    }

    return sekolah;
  }

  async listTeachers(userId: number) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    const teachers = await this.guruRepo.find({
      where: { id_sekolah: sekolah.id_sekolah },
      relations: ['user'],
      order: { id_guru: 'DESC' },
    });

    return {
      message: 'Data guru berhasil dimuat.',
      data: teachers.map((guru) => ({
        id: guru.id_guru,
        id_guru: guru.id_guru,
        id_user: guru.user?.id_user ?? null,
        nama: guru.user?.nama ?? '-',
        email: guru.user?.email ?? '-',
        no_hp: guru.user?.no_hp ?? '',
        username: guru.user?.username ?? '-',
        nip: guru.nip,
        jabatan: guru.jabatan,
        id_sekolah: guru.id_sekolah,
        status: 'Aktif',
      })),
    };
  }

  async createTeacher(userId: number, dto: CreateAdminTeacherDto) {
    this.validateTeacherDto(dto);

    const sekolah = await this.getApprovedSchoolOrFail(userId);

    const nama = this.clean(dto.nama);
    const email = this.cleanLower(dto.email);
    const username = this.cleanLower(dto.username);
    const noHp = this.normalizePhone(dto.no_hp);
    const nip = this.clean(dto.nip);

    const existingUser = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('Email atau username guru sudah digunakan.');
    }

    const existingGuru = await this.guruRepo.findOne({
      where: { nip },
    });

    if (existingGuru) {
      throw new ConflictException('NIP/NUPTK sudah terdaftar.');
    }

    const userGuru = await this.userRepo.save(
      this.userRepo.create({
        nama,
        email,
        username,
        no_hp: noHp || null,
        password: await bcrypt.hash(nip, 12),
        role: 'guru',
        id_sekolah: sekolah.id_sekolah,
        must_change_password: 1,
      }),
    );

    const guru = await this.guruRepo.save(
      this.guruRepo.create({
        nip,
        jabatan: dto.jabatan,
        id_sekolah: sekolah.id_sekolah,
        sekolah,
        user: userGuru,
      }),
    );

    return {
      message:
        'Akun guru berhasil dibuat. Password awal sama dengan NIP/NUPTK.',
      data: {
        id: guru.id_guru,
        id_user: userGuru.id_user,
        id_guru: guru.id_guru,
        nama: userGuru.nama,
        email: userGuru.email,
        no_hp: userGuru.no_hp,
        username: userGuru.username,
        nip: guru.nip,
        jabatan: guru.jabatan,
        id_sekolah: sekolah.id_sekolah,
        nama_sekolah: sekolah.nama_sekolah,
        status: 'Aktif',
      },
    };
  }

  async listJurusan(userId: number) {
  const sekolah = await this.getApprovedSchoolOrFail(userId);

  const jurusan = await this.jurusanRepo.find({
    where: {
      id_sekolah: sekolah.id_sekolah,
    },
    order: {
      id_jurusan: 'DESC',
    },
  });

  return {
    message: 'Data jurusan berhasil dimuat.',
    data: jurusan.map((item) => ({
      id: item.id_jurusan,
      id_jurusan: item.id_jurusan,
      nama: item.nama_jurusan,
      nama_jurusan: item.nama_jurusan,
      id_sekolah: item.id_sekolah,
    })),
  };
}

async createJurusan(userId: number, body: any) {
  const sekolah = await this.getApprovedSchoolOrFail(userId);

  const namaJurusan = this.clean(body?.nama_jurusan || body?.nama);

  if (!namaJurusan) {
    throw new BadRequestException('Nama jurusan wajib diisi.');
  }

  if (namaJurusan.length < 2) {
    throw new BadRequestException('Nama jurusan minimal 2 karakter.');
  }

  if (namaJurusan.length > 80) {
    throw new BadRequestException('Nama jurusan maksimal 80 karakter.');
  }

  const existing = await this.jurusanRepo.findOne({
    where: {
      nama_jurusan: namaJurusan,
      id_sekolah: sekolah.id_sekolah,
    },
  });

  if (existing) {
    throw new ConflictException('Jurusan sudah ada di sekolah ini.');
  }

  const jurusan = await this.jurusanRepo.save(
    this.jurusanRepo.create({
      nama_jurusan: namaJurusan,
      id_sekolah: sekolah.id_sekolah,
      sekolah,
    }),
  );

  return {
    message: 'Jurusan berhasil ditambahkan.',
    data: {
      id: jurusan.id_jurusan,
      id_jurusan: jurusan.id_jurusan,
      nama: jurusan.nama_jurusan,
      nama_jurusan: jurusan.nama_jurusan,
      id_sekolah: jurusan.id_sekolah,
    },
  };
}
}