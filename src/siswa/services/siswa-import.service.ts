import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';

import { Guru } from '../../guru/entities/guru.entity';
import { User, UserRole } from '../../user/entities/user.entity';
import { Siswa } from '../entities/siswa.entity';
import { createUsername, normalizeKey } from '../utils/student-normalizer';

@Injectable()
export class SiswaImportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Guru)
    private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,
  ) {}

  async importExcel(file: any, actor: { id_user: number; role: UserRole }, body: any) {
    this.validateExcelFile(file);

    const idSekolah = await this.resolveSchoolScope(actor, body);
    const rows = this.readFirstSheet(file.buffer);

    let imported = 0;
    let updated = 0;
    const accounts: Array<{
      nisn: string;
      nama: string;
      username: string;
      password_default?: string;
      akun_baru: boolean;
    }> = [];

    for (const row of rows) {
      const normalizedRow = this.normalizeExcelRow(row);
      const siswaRow = this.mapExcelRowToSiswa(normalizedRow);

      if (!siswaRow.nisn || !siswaRow.nama) continue;

      const result = await this.upsertSiswaAccount(siswaRow, idSekolah);
      imported += result.akun_baru ? 1 : 0;
      updated += result.akun_baru ? 0 : 1;
      accounts.push(result);
    }

    return {
      message: 'Import siswa berhasil diproses.',
      imported,
      updated,
      accounts,
      catatan:
        'Password sementara hanya dikembalikan untuk akun baru. Setelah login pertama, siswa wajib mengganti password.',
    };
  }

  private validateExcelFile(file: any) {
    if (!file?.buffer) {
      throw new BadRequestException(
        'File Excel belum dikirim. Gunakan field multipart bernama file.',
      );
    }

    const fileName = String(file.originalname ?? '').toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      throw new BadRequestException('File harus berformat .xlsx atau .xls.');
    }
  }

  private readFirstSheet(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('File Excel tidak memiliki sheet.');
    }

    return XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
      defval: '',
      raw: false,
    });
  }

  private normalizeExcelRow(row: Record<string, any>) {
    return Object.entries(row).reduce(
      (acc, [key, value]) => {
        acc[normalizeKey(key)] = value;
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  private mapExcelRowToSiswa(normalizedRow: Record<string, any>) {
    return {
      nisn: String(normalizedRow.nisn || normalizedRow.nis || '').trim(),
      nama: String(normalizedRow.nama || normalizedRow['nama siswa'] || '').trim(),
      kelas: String(normalizedRow.kelas || '').trim() || '-',
      jurusan:
        String(
          normalizedRow.jurusan ||
            normalizedRow['program keahlian'] ||
            normalizedRow['kompetensi keahlian'] ||
            '',
        ).trim() || '-',
    };
  }

  private async upsertSiswaAccount(
    siswaRow: { nisn: string; nama: string; kelas: string; jurusan: string },
    idSekolah: number,
  ) {
    let siswa = await this.siswaRepo.findOne({
      where: { nisn: siswaRow.nisn },
      relations: ['user'],
    });

    let akunBaru = false;
    let username = siswa?.user?.username || '';
    let plainPassword: string | undefined;

    if (!siswa) {
      username = await this.generateUniqueUsername(
        createUsername(siswaRow.nama, siswaRow.nisn),
      );
      plainPassword = this.generateTemporaryPassword(siswaRow.nisn);

      const userBaru = await this.userRepo.save(
        this.userRepo.create({
          nama: siswaRow.nama,
          email: `${siswaRow.nisn}@skilllens.local`,
          username,
          password: await bcrypt.hash(plainPassword, 12),
          role: 'siswa',
          id_sekolah: idSekolah,
          must_change_password: 1,
        }),
      );

      await this.siswaRepo.save(
        this.siswaRepo.create({
          nisn: siswaRow.nisn,
          kelas: siswaRow.kelas,
          jurusan: siswaRow.jurusan,
          id_sekolah: idSekolah,
          user: userBaru,
        }),
      );

      akunBaru = true;
    } else {
      await this.updateExistingSiswa(siswa, siswaRow, idSekolah);
      username = siswa.user?.username || username;
    }

    return {
      nisn: siswaRow.nisn,
      nama: siswaRow.nama,
      username,
      password_default: plainPassword,
      akun_baru: akunBaru,
    };
  }

  private async updateExistingSiswa(
    siswa: Siswa,
    siswaRow: { nisn: string; nama: string; kelas: string; jurusan: string },
    idSekolah: number,
  ) {
    if (siswa.id_sekolah && siswa.id_sekolah !== idSekolah) {
      throw new ForbiddenException(
        `Siswa ${siswaRow.nisn} sudah terdaftar di sekolah lain.`,
      );
    }

    siswa.kelas = siswaRow.kelas || siswa.kelas;
    siswa.jurusan = siswaRow.jurusan || siswa.jurusan;
    siswa.id_sekolah = idSekolah;

    if (siswa.user) {
      siswa.user.nama = siswaRow.nama || siswa.user.nama;
      siswa.user.id_sekolah = idSekolah;
      await this.userRepo.save(siswa.user);
    }

    await this.siswaRepo.save(siswa);
  }

  private async resolveSchoolScope(actor: { id_user: number; role: UserRole }, body: any) {
    if (actor.role === 'guru') {
      const guru = await this.guruRepo.findOne({
        where: { user: { id_user: actor.id_user } as any },
        relations: ['sekolah'],
      });

      if (!guru?.id_sekolah || guru.sekolah?.status_verifikasi !== 'approved') {
        throw new ForbiddenException('Guru belum memiliki sekolah aktif/terverifikasi.');
      }

      return guru.id_sekolah;
    }

    if (actor.role === 'admin_sekolah') {
      const user = await this.userRepo.findOne({
        where: { id_user: actor.id_user },
      });

      if (!user?.id_sekolah) {
        throw new ForbiddenException('Admin sekolah belum terhubung dengan sekolah.');
      }

      return user.id_sekolah;
    }

    const idSekolah = Number(body?.id_sekolah ?? body?.sekolahId ?? 0);
    if (!idSekolah) {
      throw new BadRequestException(
        'Admin/superadmin wajib mengirim id_sekolah saat import siswa.',
      );
    }

    return idSekolah;
  }

  private async generateUniqueUsername(baseUsername: string) {
    const fallback = baseUsername || `siswa${Date.now()}`;
    let username = fallback;
    let index = 1;

    while (await this.userRepo.findOne({ where: { username } })) {
      username = `${fallback}${index}`;
      index += 1;
    }

    return username;
  }

  private generateTemporaryPassword(nisn: string) {
    return `SL-${String(nisn).slice(-6)}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  }
}
