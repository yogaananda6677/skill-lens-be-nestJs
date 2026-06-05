import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { Guru } from '../guru/entities/guru.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Jurusan } from '../jurusan/entities/jurusan.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { NilaiSiswa } from '../nilai_siswa/entities/nilai_siswa.entity';
import { MataPelajaran } from '../mata_pelajaran/entities/mata_pelajaran.entity';
import { KurikulumMapel } from '../kurikulum_mapel/entities/kurikulum_mapel.entity';

import { CreateAdminSchoolDto } from './dto/create-admin-school.dto';
import { CreateAdminTeacherDto } from './dto/create-admin-teacher.dto';

import {
  NILAI_AKADEMIK_CATEGORIES,
  type AcademicCategory,
} from '../nilai_siswa/constants/academic-categories';

type SchoolStatus = 'none' | 'pending' | 'approved' | 'rejected';

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

    @InjectRepository(MataPelajaran)
    private readonly mataPelajaranRepo: Repository<MataPelajaran>,

    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,

    private readonly dataSource: DataSource,
  ) {}

  private clean(value?: string | null) {
    return String(value ?? '').trim();
  }

  private cleanLower(value?: string | null) {
    return this.clean(value).toLowerCase();
  }

  private normalizeJurusanName(value?: string | null) {
    return this.clean(value).replace(/\s+/g, ' ').toUpperCase();
  }

  private validateJurusanNameBySchoolType(
    namaJurusan: string,
    jenisSekolah?: string | null,
  ) {
    const jenis = String(jenisSekolah || 'SMA').toUpperCase();

    if (jenis !== 'SMA') return;

    const allowed = ['IPA', 'IPS', 'BAHASA'];

    if (!allowed.includes(namaJurusan)) {
      throw new BadRequestException(
        'Untuk SMA, jurusan hanya boleh IPA, IPS, atau BAHASA.',
      );
    }
  }

  private async getJurusanUsage(idJurusan: number) {
    const siswaCount = await this.siswaRepo.count({
      where: {
        id_jurusan: idJurusan,
      },
    });

    const mapelCount = await this.mataPelajaranRepo.count({
      where: {
        id_jurusan: idJurusan,
      },
    });

    const kurikulumCount = await this.dataSource
      .getRepository(KurikulumMapel)
      .count({
        where: {
          id_jurusan: idJurusan,
        },
      });

    const total = siswaCount + mapelCount + kurikulumCount;

    return {
      siswa: siswaCount,
      mapel: mapelCount,
      kurikulum: kurikulumCount,
      total,
      is_used: total > 0,
      can_edit: total === 0,
      can_delete: total === 0,
    };
  }

  private buildJurusanResponse(item: Jurusan, usage: any) {
    return {
      id: item.id_jurusan,
      id_jurusan: item.id_jurusan,
      nama: item.nama_jurusan,
      nama_jurusan: item.nama_jurusan,
      id_sekolah: item.id_sekolah,
      usage,
      usage_count: usage.total,
      is_used: usage.is_used,
      can_edit: usage.can_edit,
      can_delete: usage.can_delete,
    };
  }

  private normalizePhone(value?: string | null) {
    return this.clean(value).replace(/[\s\-().]/g, '');
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

  private validateSemester(value: any) {
    const semester = Number(value);

    if (!semester || ![1, 2, 3, 4, 5].includes(semester)) {
      throw new BadRequestException('Semester harus dipilih antara 1 sampai 5.');
    }

    return semester;
  }

  private async validateJurusanForMapel(
    idJurusan: number | null,
    idSekolah: number,
  ) {
    if (!idJurusan) return null;

    const jurusan = await this.jurusanRepo.findOne({
      where: {
        id_jurusan: idJurusan,
        id_sekolah: idSekolah,
      },
    });

    if (!jurusan) {
      throw new BadRequestException('Jurusan tidak ditemukan di sekolah ini.');
    }

    return jurusan;
  }

  private async findDuplicateMataPelajaran(params: {
    namaMapel: string;
    semester: number;
    idJurusan: number | null;
    idSekolah: number;
    exceptId?: number;
  }) {
    const qb = this.mataPelajaranRepo
      .createQueryBuilder('mapel')
      .where('LOWER(mapel.nama_mapel) = LOWER(:namaMapel)', {
        namaMapel: params.namaMapel,
      })
      .andWhere('mapel.semester = :semester', {
        semester: params.semester,
      })
      .andWhere('mapel.id_sekolah = :idSekolah', {
        idSekolah: params.idSekolah,
      });

    if (params.idJurusan === null) {
      qb.andWhere('mapel.id_jurusan IS NULL');
    } else {
      qb.andWhere('mapel.id_jurusan = :idJurusan', {
        idJurusan: params.idJurusan,
      });
    }

    if (params.exceptId) {
      qb.andWhere('mapel.id_mapel != :exceptId', {
        exceptId: params.exceptId,
      });
    }

    return qb.getOne();
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
        jenis_sekolah: null,
        rejection_reason: null,
        message: 'Admin sekolah belum mengajukan data sekolah.',
      };
    }

    const status = (sekolah.status_verifikasi ?? 'pending') as SchoolStatus;

    return {
      has_school: true,
      school_status: status,
      id_sekolah: sekolah.id_sekolah,
      nama_sekolah: sekolah.nama_sekolah,
      jenis_sekolah: sekolah.jenis_sekolah,
      rejection_reason: sekolah.rejection_reason ?? null,
      message:
        status === 'approved'
          ? 'Sekolah sudah diverifikasi. Fitur guru dan import siswa sudah aktif.'
          : status === 'rejected'
            ? `Pengajuan sekolah ditolak. Alasan: ${sekolah.rejection_reason || 'Silakan perbaiki data dan ajukan ulang.'}`
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

      if (duplicateNpsn && duplicateNpsn.id_sekolah !== currentSchool?.id_sekolah) {
        throw new ConflictException('NPSN sudah digunakan oleh sekolah lain.');
      }
    }

    const jenisSekolah = this.clean(dto.jenis_sekolah).toUpperCase() as
      | 'SMA'
      | 'SMK';

    let sekolah: Sekolah;

    if (currentSchool?.status_verifikasi === 'rejected') {
      currentSchool.nama_sekolah = this.clean(dto.nama_sekolah);
      currentSchool.npsn = npsn || null;
      currentSchool.alamat = this.clean(dto.alamat) || null;
      currentSchool.no_hp_sekolah = this.normalizePhone(dto.no_telp) || null;
      currentSchool.jenis_sekolah = jenisSekolah;
      currentSchool.status_verifikasi = 'pending';
      currentSchool.rejection_reason = null;
      sekolah = await this.sekolahRepo.save(currentSchool);
    } else {
      const sekolahData = this.sekolahRepo.create({
        nama_sekolah: this.clean(dto.nama_sekolah),
        npsn: npsn || null,
        alamat: this.clean(dto.alamat) || null,
        no_hp_sekolah: this.normalizePhone(dto.no_telp) || null,
        jenis_sekolah: jenisSekolah,
        status_verifikasi: 'pending',
        rejection_reason: null,
      });

      sekolah = await this.sekolahRepo.save(sekolahData);
      admin.id_sekolah = sekolah.id_sekolah;
      await this.userRepo.save(admin);
    }

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
      message: 'Akun guru berhasil dibuat. Password awal sama dengan NIP/NUPTK.',
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
      where: { id_sekolah: sekolah.id_sekolah },
      order: { nama_jurusan: 'ASC' },
    });

    const data = await Promise.all(
      jurusan.map(async (item) => {
        const usage = await this.getJurusanUsage(item.id_jurusan);
        return this.buildJurusanResponse(item, usage);
      }),
    );

    return {
      message: 'Data jurusan berhasil dimuat.',
      data,
    };
  }

  async createJurusan(userId: number, body: any) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);
    const namaJurusan = this.normalizeJurusanName(
      body?.nama_jurusan || body?.nama,
    );

    if (!namaJurusan) {
      throw new BadRequestException('Nama jurusan wajib diisi.');
    }

    if (namaJurusan.length < 2) {
      throw new BadRequestException('Nama jurusan minimal 2 karakter.');
    }

    if (namaJurusan.length > 80) {
      throw new BadRequestException('Nama jurusan maksimal 80 karakter.');
    }

    this.validateJurusanNameBySchoolType(
      namaJurusan,
      sekolah.jenis_sekolah,
    );

    const duplicate = await this.jurusanRepo
      .createQueryBuilder('jurusan')
      .where('LOWER(jurusan.nama_jurusan) = LOWER(:namaJurusan)', {
        namaJurusan,
      })
      .andWhere('jurusan.id_sekolah = :idSekolah', {
        idSekolah: sekolah.id_sekolah,
      })
      .getOne();

    if (duplicate) {
      throw new ConflictException('Jurusan sudah ada di sekolah ini.');
    }

    const jurusan = await this.jurusanRepo.save(
      this.jurusanRepo.create({
        nama_jurusan: namaJurusan,
        id_sekolah: sekolah.id_sekolah,
        sekolah,
      }),
    );

    const usage = await this.getJurusanUsage(jurusan.id_jurusan);

    return {
      message: 'Jurusan berhasil ditambahkan.',
      data: this.buildJurusanResponse(jurusan, usage),
    };
  }

  async updateJurusan(userId: number, idJurusan: number, body: any) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    if (!idJurusan) {
      throw new BadRequestException('ID jurusan tidak valid.');
    }

    const jurusan = await this.jurusanRepo.findOne({
      where: {
        id_jurusan: idJurusan,
        id_sekolah: sekolah.id_sekolah,
      },
    });

    if (!jurusan) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    const usage = await this.getJurusanUsage(idJurusan);

    if (usage.is_used) {
      throw new BadRequestException(
        `Jurusan ${jurusan.nama_jurusan} tidak bisa diedit karena sudah dipakai oleh ${usage.siswa} siswa, ${usage.mapel} mapel, dan ${usage.kurikulum} kurikulum mapel.`,
      );
    }

    const namaJurusan = this.normalizeJurusanName(
      body?.nama_jurusan || body?.nama,
    );

    if (!namaJurusan) {
      throw new BadRequestException('Nama jurusan wajib diisi.');
    }

    if (namaJurusan.length < 2) {
      throw new BadRequestException('Nama jurusan minimal 2 karakter.');
    }

    if (namaJurusan.length > 80) {
      throw new BadRequestException('Nama jurusan maksimal 80 karakter.');
    }

    this.validateJurusanNameBySchoolType(
      namaJurusan,
      sekolah.jenis_sekolah,
    );

    const duplicate = await this.jurusanRepo
      .createQueryBuilder('jurusan')
      .where('LOWER(jurusan.nama_jurusan) = LOWER(:namaJurusan)', {
        namaJurusan,
      })
      .andWhere('jurusan.id_sekolah = :idSekolah', {
        idSekolah: sekolah.id_sekolah,
      })
      .andWhere('jurusan.id_jurusan != :idJurusan', {
        idJurusan,
      })
      .getOne();

    if (duplicate) {
      throw new ConflictException('Jurusan tersebut sudah ada.');
    }

    jurusan.nama_jurusan = namaJurusan;

    const saved = await this.jurusanRepo.save(jurusan);
    const newUsage = await this.getJurusanUsage(saved.id_jurusan);

    return {
      message: 'Jurusan berhasil diperbarui.',
      data: this.buildJurusanResponse(saved, newUsage),
    };
  }

  async deleteJurusan(userId: number, idJurusan: number) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    if (!idJurusan) {
      throw new BadRequestException('ID jurusan tidak valid.');
    }

    const jurusan = await this.jurusanRepo.findOne({
      where: {
        id_jurusan: idJurusan,
        id_sekolah: sekolah.id_sekolah,
      },
    });

    if (!jurusan) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    const usage = await this.getJurusanUsage(idJurusan);

    if (usage.is_used) {
      throw new BadRequestException(
        `Jurusan ${jurusan.nama_jurusan} tidak bisa dihapus karena sudah dipakai oleh ${usage.siswa} siswa, ${usage.mapel} mapel, dan ${usage.kurikulum} kurikulum mapel.`,
      );
    }

    await this.jurusanRepo.delete({
      id_jurusan: idJurusan,
      id_sekolah: sekolah.id_sekolah,
    });

    return {
      message: 'Jurusan berhasil dihapus.',
    };
  }

  async listSiswa(userId: number, query: any) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    const page = Math.max(Number(query?.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query?.limit ?? 10), 1), 100);
    const skip = (page - 1) * limit;

    const keyword = this.clean(query?.keyword);
    const rawIdJurusan = query?.id_jurusan ?? query?.idJurusan ?? query?.jurusanId ?? 0;
    const idJurusan = Number(rawIdJurusan);
    const requestedJurusanName = this.clean(query?.jurusan ?? query?.nama_jurusan ?? query?.jurusan_name);
    const kelas = this.clean(query?.kelas);

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

    if (Number.isFinite(idJurusan) && idJurusan > 0) {
      const selectedJurusan = await this.jurusanRepo.findOne({
        where: {
          id_jurusan: idJurusan,
          id_sekolah: sekolah.id_sekolah,
        },
      });

      const selectedJurusanName = this.clean(selectedJurusan?.nama_jurusan) || requestedJurusanName;

      if (selectedJurusanName) {
        qb.andWhere(
          '(siswa.id_jurusan = :idJurusan OR LOWER(TRIM(siswa.jurusan)) = LOWER(TRIM(:selectedJurusanName)))',
          {
            idJurusan,
            selectedJurusanName,
          },
        );
      } else {
        qb.andWhere('siswa.id_jurusan = :idJurusan', {
          idJurusan,
        });
      }
    } else if (requestedJurusanName) {
      qb.andWhere('LOWER(TRIM(siswa.jurusan)) = LOWER(TRIM(:requestedJurusanName))', {
        requestedJurusanName,
      });
    }

    if (kelas) {
      qb.andWhere('siswa.kelas = :kelas', {
        kelas,
      });
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
        kelas: siswa.kelas,
        jurusan: siswa.jurusan_detail?.nama_jurusan || siswa.jurusan || '-',
        id_jurusan: siswa.id_jurusan,
        status: 'Aktif',
      })),
    };
  }

  async listMataPelajaran(userId: number) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    const rows = await this.mataPelajaranRepo
      .createQueryBuilder('mapel')
      .leftJoinAndSelect('mapel.jurusan', 'jurusan')
      .where('mapel.id_sekolah = :idSekolah', {
        idSekolah: sekolah.id_sekolah,
      })
      .orWhere('mapel.is_default = :isDefault', {
        isDefault: true,
      })
      .orderBy('mapel.semester', 'ASC')
      .addOrderBy('mapel.nama_mapel', 'ASC')
      .getMany();

    return {
      message: 'Data mata pelajaran berhasil dimuat.',
      data: rows.map((item) => ({
        id_mapel: item.id_mapel,
        nama_mapel: item.nama_mapel,
        kode_mapel: item.kode_mapel,
        kategori: item.kategori,
        semester: item.semester,
        tipe_mapel: item.tipe_mapel,
        id_jurusan: item.id_jurusan,
        id_sekolah: item.id_sekolah,
        is_default: item.is_default,
        nama_jurusan: item.jurusan?.nama_jurusan ?? null,
        jurusan: item.jurusan
          ? {
              id: item.jurusan.id_jurusan,
              nama: item.jurusan.nama_jurusan,
            }
          : null,
      })),
    };
  }

  async createMataPelajaran(userId: number, body: any) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    const namaMapel = this.clean(body?.nama_mapel);
    const semester = this.validateSemester(body?.semester);

    if (!namaMapel) {
      throw new BadRequestException('Nama mata pelajaran wajib diisi.');
    }

    if (namaMapel.length < 2) {
      throw new BadRequestException('Nama mata pelajaran minimal 2 karakter.');
    }

    if (namaMapel.length > 100) {
      throw new BadRequestException('Nama mata pelajaran maksimal 100 karakter.');
    }

    const isSemesterUmum = semester === 1 || semester === 2;
    const tipeMapel: 'umum' | 'jurusan' = isSemesterUmum
      ? 'umum'
      : 'jurusan';

    const idJurusan = isSemesterUmum ? null : Number(body?.id_jurusan);

    if (isSemesterUmum && body?.id_jurusan) {
      throw new BadRequestException(
        'Semester 1 dan 2 tidak boleh memilih jurusan.',
      );
    }

    if (!isSemesterUmum && !idJurusan) {
      throw new BadRequestException(
        'Semester 3, 4, dan 5 wajib memilih jurusan.',
      );
    }

    await this.validateJurusanForMapel(idJurusan, sekolah.id_sekolah);

    const duplicate = await this.findDuplicateMataPelajaran({
      namaMapel,
      semester,
      idJurusan,
      idSekolah: sekolah.id_sekolah,
    });

    if (duplicate) {
      throw new ConflictException(
        'Mata pelajaran sudah ada pada semester dan jurusan tersebut.',
      );
    }

    const mapel = await this.mataPelajaranRepo.save(
      this.mataPelajaranRepo.create({
        nama_mapel: namaMapel,
        semester,
        tipe_mapel: tipeMapel,
        id_jurusan: idJurusan,
        id_sekolah: sekolah.id_sekolah,
        is_default: false,
      }),
    );

    return {
      message: 'Mata pelajaran berhasil ditambahkan.',
      data: {
        id_mapel: mapel.id_mapel,
        nama_mapel: mapel.nama_mapel,
        semester: mapel.semester,
        tipe_mapel: mapel.tipe_mapel,
        id_jurusan: mapel.id_jurusan,
        id_sekolah: mapel.id_sekolah,
        is_default: mapel.is_default,
      },
    };
  }

  async updateMataPelajaran(userId: number, idMapel: number, body: any) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    if (!idMapel) {
      throw new BadRequestException('ID mata pelajaran tidak valid.');
    }

    const mapel = await this.mataPelajaranRepo.findOne({
      where: {
        id_mapel: idMapel,
        id_sekolah: sekolah.id_sekolah,
      },
    });

    if (!mapel) {
      throw new NotFoundException('Mata pelajaran tidak ditemukan.');
    }

    if (mapel.is_default) {
      throw new BadRequestException(
        'Mata pelajaran default tidak bisa diedit.',
      );
    }

    const namaMapel = this.clean(body?.nama_mapel);
    const semester = this.validateSemester(body?.semester);

    if (!namaMapel) {
      throw new BadRequestException('Nama mata pelajaran wajib diisi.');
    }

    if (namaMapel.length < 2) {
      throw new BadRequestException('Nama mata pelajaran minimal 2 karakter.');
    }

    if (namaMapel.length > 100) {
      throw new BadRequestException('Nama mata pelajaran maksimal 100 karakter.');
    }

    const isSemesterUmum = semester === 1 || semester === 2;
    const tipeMapel: 'umum' | 'jurusan' = isSemesterUmum
      ? 'umum'
      : 'jurusan';

    const idJurusan = isSemesterUmum ? null : Number(body?.id_jurusan);

    if (isSemesterUmum && body?.id_jurusan) {
      throw new BadRequestException(
        'Semester 1 dan 2 tidak boleh memilih jurusan.',
      );
    }

    if (!isSemesterUmum && !idJurusan) {
      throw new BadRequestException(
        'Semester 3, 4, dan 5 wajib memilih jurusan.',
      );
    }

    await this.validateJurusanForMapel(idJurusan, sekolah.id_sekolah);

    const duplicate = await this.findDuplicateMataPelajaran({
      namaMapel,
      semester,
      idJurusan,
      idSekolah: sekolah.id_sekolah,
      exceptId: idMapel,
    });

    if (duplicate) {
      throw new ConflictException(
        'Mata pelajaran sudah ada pada semester dan jurusan tersebut.',
      );
    }

    mapel.nama_mapel = namaMapel;
    mapel.semester = semester;
    mapel.tipe_mapel = tipeMapel;
    mapel.id_jurusan = idJurusan;

    const saved = await this.mataPelajaranRepo.save(mapel);

    return {
      message: 'Mata pelajaran berhasil diperbarui.',
      data: {
        id_mapel: saved.id_mapel,
        nama_mapel: saved.nama_mapel,
        semester: saved.semester,
        tipe_mapel: saved.tipe_mapel,
        id_jurusan: saved.id_jurusan,
        id_sekolah: saved.id_sekolah,
        is_default: saved.is_default,
      },
    };
  }

  async deleteMataPelajaran(userId: number, idMapel: number) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    if (!idMapel) {
      throw new BadRequestException('ID mata pelajaran tidak valid.');
    }

    const mapel = await this.mataPelajaranRepo.findOne({
      where: {
        id_mapel: idMapel,
        id_sekolah: sekolah.id_sekolah,
      },
    });

    if (!mapel) {
      throw new NotFoundException('Mata pelajaran tidak ditemukan.');
    }

    if (mapel.is_default) {
      throw new BadRequestException(
        'Mata pelajaran default tidak bisa dihapus.',
      );
    }

    await this.mataPelajaranRepo.delete(idMapel);

    return {
      message: 'Mata pelajaran berhasil dihapus.',
    };
  }

  async createDefaultMataPelajaranUmum(userId: number) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    const defaultMapelUmum = [
      'Bahasa Indonesia',
      'Bahasa Daerah',
      'Bahasa Inggris',
      'Pendidikan Pancasila dan Kewarganegaraan',
      'Pendidikan Agama',
      'PJOK',
      'Seni Budaya',
    ];

    const semesters = [1, 2, 3, 4, 5, 6];

    let created = 0;
    let skipped = 0;

    for (const semester of semesters) {
      for (const namaMapel of defaultMapelUmum) {
        const existing = await this.mataPelajaranRepo.findOne({
          where: {
            nama_mapel: namaMapel,
            semester,
            id_sekolah: sekolah.id_sekolah,
            tipe_mapel: 'umum',
            id_jurusan: IsNull(),
          },
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        await this.mataPelajaranRepo.save(
          this.mataPelajaranRepo.create({
            nama_mapel: namaMapel,
            semester,
            tipe_mapel: 'umum',
            id_jurusan: null,
            id_sekolah: sekolah.id_sekolah,
            is_default: false,
          }),
        );

        created += 1;
      }
    }

    return {
      message:
        created > 0
          ? `${created} mata pelajaran umum berhasil ditambahkan. ${skipped} data dilewati karena sudah ada.`
          : 'Semua mata pelajaran umum sudah tersedia.',
      created,
      skipped,
    };
  }

  async getNilaiSiswa(siswaId: number, userId: number) {
    const sekolah = await this.getApprovedSchoolOrFail(userId);

    const siswa = await this.siswaRepo.findOne({
      where: {
        id_siswa: siswaId,
        id_sekolah: sekolah.id_sekolah,
      },
      relations: ['user'],
    });

    if (!siswa) {
      throw new NotFoundException('Siswa tidak ditemukan.');
    }

    const nilaiRows = await this.dataSource
      .getRepository(NilaiSiswa)
      .find({
        where: {
          id_siswa: siswaId,
        },
        relations: [
          'kurikulum_mapel',
          'kurikulum_mapel.semester',
          'kurikulum_mapel.mata_pelajaran',
        ],
        order: {
          id_nilai: 'ASC',
        },
      });

    function parseSemesterName(value?: string | null) {
      const match = String(value ?? '').match(/\d+/);
      return match ? Number(match[0]) : null;
    }

    function labelKategori(kategori: string) {
      const labels: Record<string, string> = {
        numerik: 'Numerik',
        bahasa: 'Bahasa',
        sains: 'Sains',
        sosial: 'Sosial',
        teknologi: 'Teknologi',
        agama: 'Agama',
        kreativitas: 'Kreativitas',
        softskill: 'Softskill',
      };

      return labels[kategori] || kategori;
    }

    type CategoryBucket = {
      kategori: AcademicCategory;
      label: string;
      total: number;
      jumlah_mapel: number;
      rata_rata: number | null;
      mapel: string[];
    };

    type SemesterBucket = {
      semester: number;
      kategori: Record<AcademicCategory, CategoryBucket>;
    };

    const semesterMap = new Map<number, SemesterBucket>();

    function getOrCreateSemesterBucket(semester: number) {
      let bucket = semesterMap.get(semester);

      if (!bucket) {
        const kategori = NILAI_AKADEMIK_CATEGORIES.reduce((acc, item) => {
          acc[item] = {
            kategori: item,
            label: labelKategori(item),
            total: 0,
            jumlah_mapel: 0,
            rata_rata: null,
            mapel: [],
          };

          return acc;
        }, {} as Record<AcademicCategory, CategoryBucket>);

        bucket = {
          semester,
          kategori,
        };

        semesterMap.set(semester, bucket);
      }

      return bucket;
    }

    const data = nilaiRows
      .map((row) => {
        const kurikulum = row.kurikulum_mapel;
        const mapel = kurikulum?.mata_pelajaran;

        const namaMapel = mapel?.nama_mapel?.trim();

        if (!namaMapel) {
          return null;
        }

        const semester =
          mapel?.semester ??
          parseSemesterName(kurikulum?.semester?.nama_semester) ??
          0;

        const kategori = (mapel?.kategori || 'softskill') as AcademicCategory;

        const bucket = getOrCreateSemesterBucket(semester);
        const categoryBucket = bucket.kategori[kategori];

        categoryBucket.total += Number(row.nilai || 0);
        categoryBucket.jumlah_mapel += 1;
        categoryBucket.mapel.push(namaMapel);

        return {
          id_nilai: row.id_nilai,
          id_kurikulum_mapel:
            row.id_kurikulum_mapel ?? kurikulum?.id_kurikulum_mapel,
          nama_mapel: namaMapel,
          nilai: row.nilai,
          semester,
          kategori,
          kategori_label: labelKategori(kategori),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (a.semester !== b.semester) {
          return a.semester - b.semester;
        }

        return a.nama_mapel.localeCompare(b.nama_mapel);
      });

    const perSemester = Array.from(semesterMap.values())
      .sort((a, b) => a.semester - b.semester)
      .map((semesterItem) => {
        const kategori = NILAI_AKADEMIK_CATEGORIES.reduce((acc, item) => {
          const bucket = semesterItem.kategori[item];

          acc[item] = {
            kategori: bucket.kategori,
            label: bucket.label,
            rata_rata: bucket.jumlah_mapel
              ? Number((bucket.total / bucket.jumlah_mapel).toFixed(2))
              : null,
            jumlah_mapel: bucket.jumlah_mapel,
            mapel: bucket.mapel.sort(),
          };

          return acc;
        }, {} as Record<
          AcademicCategory,
          {
            kategori: AcademicCategory;
            label: string;
            rata_rata: number | null;
            jumlah_mapel: number;
            mapel: string[];
          }
        >);

        return {
          semester: semesterItem.semester,
          kategori,
        };
      });

    return {
      data,
      per_semester: perSemester,
    };
  }
}