import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../user/entities/user.entity';
import { Siswa } from './entities/siswa.entity';
import { ProfileSiswa } from '../profile_siswa/entities/profile_siswa.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';

function normalizeKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\[\]{}.,:;|/\\_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function createUsername(nama: string, nisn: string) {
  const cleanName = normalizeKey(nama).replace(/\s/g, '');
  return `${cleanName}${String(nisn).slice(-4)}`;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

@Injectable()
export class SiswaService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,

    @InjectRepository(ProfileSiswa)
    private readonly profileRepo: Repository<ProfileSiswa>,

    @InjectRepository(NilaiKategoriSiswa)
    private readonly kategoriRepo: Repository<NilaiKategoriSiswa>,
  ) {}

  async getMe(userId: number) {
    const siswa = await this.siswaRepo.findOne({
      where: { user: { id_user: userId } as any },
      relations: ['user', 'sekolah', 'jurusan_detail'],
    });

    if (!siswa) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    const [profile, nilaiKategori] = await Promise.all([
      this.profileRepo.findOne({ where: { id_siswa: siswa.id_siswa } }),
      this.kategoriRepo.find({ where: { id_siswa: siswa.id_siswa } }),
    ]);

    const nilaiAkademik = nilaiKategori.reduce((acc, item) => {
      acc[item.kategori] = Number(item.nilai ?? 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      id_siswa: siswa.id_siswa,
      nisn: siswa.nisn,
      nama: siswa.user?.nama ?? '',
      email: siswa.user?.email ?? '',
      kelas: siswa.kelas,
      jurusan: siswa.jurusan_detail?.nama_jurusan ?? siswa.jurusan,
      id_jurusan: siswa.id_jurusan,
      sekolah: siswa.sekolah
        ? {
            id: siswa.sekolah.id_sekolah,
            nama: siswa.sekolah.nama_sekolah,
            status: siswa.sekolah.status_verifikasi,
          }
        : null,
      minat: profile?.minat ?? [],
      hobi: profile?.hobi ?? [],
      bakat: profile?.bakat ?? [],
      skill: profile?.skill ?? [],
      prestasi: profile?.prestasi ?? '',
      tujuan: profile?.tujuan ?? '',
      preferensi_belajar: profile?.preferensi_belajar ?? '',
      kendala: profile?.kendala ?? '',
      nilai_akademik: nilaiAkademik,
    };
  }

  async updateProfil(userId: number, body: any) {
    const siswa = await this.siswaRepo.findOne({
      where: { user: { id_user: userId } as any },
      relations: ['user'],
    });

    if (!siswa) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    let profile = await this.profileRepo.findOne({ where: { id_siswa: siswa.id_siswa } });

    if (!profile) {
      profile = this.profileRepo.create({
        id_siswa: siswa.id_siswa,
        siswa,
      });
    }

    profile.minat = toStringArray(body?.minat);
    profile.hobi = toStringArray(body?.hobi);
    profile.bakat = toStringArray(body?.bakat);
    profile.skill = toStringArray(body?.skill);
    profile.prestasi = String(body?.prestasi ?? '').trim() || null;
    profile.tujuan = String(body?.tujuan ?? '').trim() || null;
    profile.preferensi_belajar = String(body?.preferensi_belajar ?? '').trim() || null;
    profile.kendala = String(body?.kendala ?? '').trim() || null;

    const saved = await this.profileRepo.save(profile);

    return {
      message: 'Profil siswa berhasil disimpan.',
      data: {
        id_profile_siswa: saved.id_profile_siswa,
        id_siswa: saved.id_siswa,
      },
    };
  }

  async prosesSpk(userId: number, body: any) {
    await this.updateProfil(userId, body);
    const siswa = await this.getMe(userId);

    if (!siswa.nilai_akademik || Object.keys(siswa.nilai_akademik).length === 0) {
      throw new BadRequestException('Nilai akademik siswa belum tersedia. Hubungi guru untuk memproses data nilai.');
    }

    const payload = {
      id_siswa: siswa.id_siswa,
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
      jurusan: siswa.jurusan,
      sekolah: siswa.sekolah,
      nilai_akademik: siswa.nilai_akademik,
      minat: siswa.minat,
      hobi: siswa.hobi,
      bakat: siswa.bakat,
      skill: siswa.skill,
      prestasi: siswa.prestasi,
      tujuan: siswa.tujuan,
      preferensi_belajar: siswa.preferensi_belajar,
      kendala: siswa.kendala,
    };

    const spkUrl = process.env.SPK_API_URL || 'http://localhost:8000/rekomendasi';
    const response = await fetch(spkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new BadRequestException(result?.message || 'Gagal memproses rekomendasi dari layanan SPK.');
    }

    return {
      message: 'Rekomendasi berhasil diproses.',
      payload,
      data: result,
    };
  }

  async importExcel(file: any) {
    if (!file?.buffer) {
      throw new BadRequestException('File Excel belum dikirim. Gunakan field multipart bernama file.');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
      defval: '',
      raw: false,
    });

    let imported = 0;
    let updated = 0;
    const accounts: Array<{ nisn: string; nama: string; username: string; password_default: string; akun_baru: boolean }> = [];

    for (const row of rows) {
      const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
        acc[normalizeKey(key)] = value;
        return acc;
      }, {} as Record<string, any>);

      const nisn = String(normalizedRow.nisn || normalizedRow.nis || '').trim();
      const nama = String(normalizedRow.nama || normalizedRow['nama siswa'] || '').trim();
      const kelas = String(normalizedRow.kelas || '').trim() || '-';
      const jurusan = String(normalizedRow.jurusan || normalizedRow['program keahlian'] || normalizedRow['kompetensi keahlian'] || '').trim() || '-';

      if (!nisn || !nama) continue;

      let siswa = await this.siswaRepo.findOne({ where: { nisn }, relations: ['user'] });
      let akunBaru = false;
      let username = siswa?.user?.username || '';

      if (!siswa) {
        username = await this.generateUniqueUsername(createUsername(nama, nisn));
        const password = await bcrypt.hash(nisn, 12);
        const userBaru = await this.userRepo.save({
          nama,
          email: `${nisn}@skilllens.local`,
          username,
          password,
          role: 'siswa',
        });

        siswa = await this.siswaRepo.save({
          nisn,
          kelas,
          jurusan,
          user: userBaru,
        });
        akunBaru = true;
        imported += 1;
      } else {
        siswa.kelas = kelas || siswa.kelas;
        siswa.jurusan = jurusan || siswa.jurusan;
        if (siswa.user) {
          siswa.user.nama = nama || siswa.user.nama;
          await this.userRepo.save(siswa.user);
        }
        await this.siswaRepo.save(siswa);
        updated += 1;
      }

      accounts.push({
        nisn,
        nama,
        username,
        password_default: nisn,
        akun_baru: akunBaru,
      });
    }

    return {
      message: 'Import siswa berhasil diproses',
      imported,
      updated,
      accounts,
    };
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
}
