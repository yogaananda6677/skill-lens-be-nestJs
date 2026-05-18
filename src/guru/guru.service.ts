import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Guru } from './entities/guru.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { NilaiKategoriSiswa } from '../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';
import { Jurusan } from '../jurusan/entities/jurusan.entity';

@Injectable()
export class GuruService {
  constructor(
    @InjectRepository(Guru) private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Siswa) private readonly siswaRepo: Repository<Siswa>,
    @InjectRepository(NilaiKategoriSiswa)
    private readonly kategoriRepo: Repository<NilaiKategoriSiswa>,
    @InjectRepository(Sekolah)
    private readonly sekolahRepo: Repository<Sekolah>,
    @InjectRepository(Jurusan)
    private readonly jurusanRepo: Repository<Jurusan>,
  ) {}

  private async getGuruByUserId(userId: number) {
    const guru = await this.guruRepo.findOne({
      where: { user: { id_user: userId } as any },
      relations: ['user', 'sekolah'],
    });

    if (!guru) {
      throw new NotFoundException('Profil guru tidak ditemukan.');
    }

    return guru;
  }

  private ensureApprovedSchool(guru: Guru) {
    if (!guru.sekolah) {
      throw new ForbiddenException(
        'Akses belum tersedia. Pilih atau ajukan sekolah terlebih dahulu.',
      );
    }

    if (guru.sekolah.status_verifikasi !== 'approved') {
      throw new ForbiddenException('Sekolah masih menunggu verifikasi admin.');
    }
  }

  private async ensureSmaMajors(sekolahId: number) {
    const smaMajors = ['IPA', 'IPS', 'BAHASA'];

    // Jika jenis sekolah SMA, pastikan jurusan tabel sudah ada 3 record standar.
    const existingRows = await this.jurusanRepo.find({
      where: { id_sekolah: sekolahId },
      select: ['nama_jurusan', 'id_jurusan'],
    });

    const existingNames = new Set(existingRows.map((r) => r.nama_jurusan));

    for (const nama_jurusan of smaMajors) {
      if (existingNames.has(nama_jurusan)) continue;

      const sekolah = await this.sekolahRepo.findOne({ where: { id_sekolah: sekolahId } });
      if (!sekolah) continue;

      await this.jurusanRepo.save(
        this.jurusanRepo.create({
          id_sekolah: sekolahId,
          sekolah,
          nama_jurusan,
        }),
      );
    }
  }

  async getWorkspace(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    const schoolStatus = guru.sekolah?.status_verifikasi ?? 'belum_diajukan';
    const canAccessWorkspace = Boolean(
      guru.sekolah && guru.sekolah.status_verifikasi === 'approved',
    );

    const jurusan = canAccessWorkspace
      ? await this.jurusanRepo.find({
          where: { sekolah: { id_sekolah: guru.sekolah!.id_sekolah } as any },
          order: { nama_jurusan: 'ASC' },
        })
      : [];

    const siswaCount = canAccessWorkspace
      ? await this.siswaRepo.count({
          where: { id_sekolah: guru.sekolah!.id_sekolah },
        })
      : 0;

    return {
      guru: {
        id_guru: guru.id_guru,
        nama: guru.user.nama,
        email: guru.user.email,
        nip: guru.nip,
        jabatan: guru.jabatan,
      },
      sekolah: guru.sekolah
        ? {
            id: guru.sekolah.id_sekolah,
            nama: guru.sekolah.nama_sekolah,
            jenis: guru.sekolah.jenis_sekolah,
            alamat: guru.sekolah.alamat,
            status: guru.sekolah.status_verifikasi,
          }
        : null,
      canAccessWorkspace,
      lockReason: canAccessWorkspace
        ? null
        : guru.sekolah
          ? 'Sekolah sedang menunggu verifikasi admin.'
          : 'Guru belum memilih atau mengajukan sekolah.',
      stats: {
        siswa: siswaCount,
        jurusan: jurusan.length,
        dataValid: 0,
        perluReview: 0,
      },
      jurusan: jurusan.map((item) => ({
        id: item.id_jurusan,
        nama: item.nama_jurusan,
      })),
    };
  }

  async chooseSchool(userId: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    const idSekolah = Number(body?.id_sekolah ?? body?.sekolahId ?? 0);

    if (!idSekolah) {
      throw new BadRequestException('ID sekolah wajib dikirim.');
    }

    const sekolah = await this.sekolahRepo.findOne({
      where: { id_sekolah: idSekolah },
    });
    if (!sekolah) {
      throw new NotFoundException('Sekolah tidak ditemukan.');
    }

    guru.sekolah = sekolah;
    guru.id_sekolah = sekolah.id_sekolah;
    await this.guruRepo.save(guru);

    return {
      message:
        sekolah.status_verifikasi === 'approved'
          ? 'Sekolah berhasil dipilih. Ruang kerja sudah dapat digunakan.'
          : 'Sekolah berhasil dipilih dan menunggu verifikasi admin.',
      sekolah: {
        id: sekolah.id_sekolah,
        nama: sekolah.nama_sekolah,
        status: sekolah.status_verifikasi,
      },
    };
  }

  async requestNewSchool(userId: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    const namaSekolah = String(
      body?.nama_sekolah ?? body?.namaSekolah ?? '',
    ).trim();
    const jenisSekolah = String(body?.jenis_sekolah ?? body?.jenisSekolah ?? '')
      .trim()
      .toUpperCase();

    if (!namaSekolah || !['SMA', 'SMK'].includes(jenisSekolah)) {
      throw new BadRequestException(
        'Nama sekolah dan jenis sekolah wajib diisi.',
      );
    }

    const sekolah = await this.sekolahRepo.save(
      this.sekolahRepo.create({
        nama_sekolah: namaSekolah,
        npsn: body?.npsn ? String(body.npsn).trim() : null,
        alamat: body?.alamat ? String(body.alamat).trim() : null,
        no_hp_sekolah: body?.no_hp_sekolah
          ? String(body.no_hp_sekolah).trim()
          : null,
        jenis_sekolah: jenisSekolah as 'SMA' | 'SMK',
        status_verifikasi: 'pending',
      }),
    );

    guru.sekolah = sekolah;
    guru.id_sekolah = sekolah.id_sekolah;
    await this.guruRepo.save(guru);

    return {
      message:
        'Pengajuan sekolah berhasil dikirim. Ruang kerja akan aktif setelah admin menyetujui sekolah.',
      sekolah: {
        id: sekolah.id_sekolah,
        nama: sekolah.nama_sekolah,
        status: sekolah.status_verifikasi,
      },
    };
  }

  async getJurusan(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const rows = await this.jurusanRepo.find({
      where: { id_sekolah: guru.sekolah!.id_sekolah },
      order: { nama_jurusan: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id_jurusan,
      nama: row.nama_jurusan,
      id_sekolah: row.id_sekolah,
    }));
  }

  async createJurusan(userId: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const namaJurusan = String(
      body?.nama_jurusan ?? body?.namaJurusan ?? body?.nama ?? '',
    ).trim();
    if (!namaJurusan) {
      throw new BadRequestException('Nama jurusan wajib diisi.');
    }

    const existing = await this.jurusanRepo.findOne({
      where: {
        id_sekolah: guru.sekolah!.id_sekolah,
        nama_jurusan: namaJurusan,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Jurusan tersebut sudah terdaftar di sekolah ini.',
      );
    }

    const jurusan = this.jurusanRepo.create({
      id_sekolah: guru.sekolah!.id_sekolah,
      sekolah: guru.sekolah!,
      nama_jurusan: namaJurusan,
    });

    const saved = await this.jurusanRepo.save(jurusan);

    return {
      message: 'Jurusan berhasil ditambahkan.',
      data: {
        id: saved.id_jurusan,
        nama: saved.nama_jurusan,
        id_sekolah: saved.id_sekolah,
      },
    };
  }

  async updateJurusan(userId: number, id: number, body: any) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const namaJurusan = String(
      body?.nama_jurusan ?? body?.namaJurusan ?? body?.nama ?? '',
    ).trim();
    if (!namaJurusan) {
      throw new BadRequestException('Nama jurusan wajib diisi.');
    }

    const jurusan = await this.jurusanRepo.findOne({
      where: {
        id_jurusan: id,
        id_sekolah: guru.sekolah!.id_sekolah,
      },
    });

    if (!jurusan) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    const existing = await this.jurusanRepo.findOne({
      where: {
        id_sekolah: guru.sekolah!.id_sekolah,
        nama_jurusan: namaJurusan,
      },
    });

    if (existing && existing.id_jurusan !== id) {
      throw new BadRequestException(
        'Nama jurusan sudah digunakan di sekolah ini.',
      );
    }

    jurusan.nama_jurusan = namaJurusan;
    const saved = await this.jurusanRepo.save(jurusan);

    return {
      message: 'Jurusan berhasil diperbarui.',
      data: {
        id: saved.id_jurusan,
        nama: saved.nama_jurusan,
        id_sekolah: saved.id_sekolah,
      },
    };
  }

  async deleteJurusan(userId: number, id: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const jurusan = await this.jurusanRepo.findOne({
      where: {
        id_jurusan: id,
        id_sekolah: guru.sekolah!.id_sekolah,
      },
    });

    if (!jurusan) {
      throw new NotFoundException('Jurusan tidak ditemukan.');
    }

    await this.jurusanRepo.remove(jurusan);

    return {
      message: 'Jurusan berhasil dihapus.',
    };
  }

  async getGuidanceCases(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    const siswa = await this.siswaRepo.find({
      where: { id_sekolah: guru.sekolah!.id_sekolah },
      relations: ['user'],
      take: 30,
      order: { id_siswa: 'DESC' },
    });

    const cases = [] as any[];
    for (const item of siswa) {
      const nilai = await this.kategoriRepo.find({
        where: { id_siswa: item.id_siswa },
      });
      const avg = nilai.length
        ? Math.round(
            nilai.reduce((sum, row) => sum + Number(row.nilai || 0), 0) /
              nilai.length,
          )
        : 0;
      const priority =
        avg && avg < 75 ? 'Tinggi' : avg < 85 ? 'Sedang' : 'Normal';
      cases.push({
        id: `g-${item.id_siswa}`,
        studentId: String(item.id_siswa),
        studentName: item.user?.nama ?? item.nisn,
        className: item.kelas,
        topic: avg
          ? 'Tindak lanjut hasil rekomendasi dari layanan SPK'
          : 'Lengkapi data akademik dan profil siswa',
        priority,
        status: 'Menunggu',
        requestedAt: new Date().toLocaleDateString('id-ID'),
        schedule: 'Belum dijadwalkan',
        recommendation:
          avg >= 85
            ? 'Kandidat prioritas untuk rekomendasi lanjutan'
            : avg >= 75
              ? 'Perlu validasi minat dan tujuan'
              : 'Perlu pendampingan akademik dasar',
        lastNote: avg
          ? `Rata-rata kategori akademik ${avg}. Validasi rekomendasi dilakukan melalui layanan SPK Python.`
          : 'Data nilai belum lengkap.',
        progress: Math.max(10, Math.min(95, avg || 20)),
      });
    }

    return cases;
  }

  async getSiswaAccounts(userId: number) {
    const guru = await this.getGuruByUserId(userId);
    this.ensureApprovedSchool(guru);

    // Ambil semua siswa milik sekolah aktif guru beserta user (akun).
    // Password_default tidak tersimpan permanen di tabel user, jadi kita pakai aturan existing:
    // pada saat import, password_default dibuat dari nisn.
    const siswaRows = await this.siswaRepo.find({
      where: { id_sekolah: guru.sekolah!.id_sekolah },
      relations: ['user'],
      order: { id_siswa: 'ASC' },
    });

    return siswaRows
      .filter((row) => Boolean(row.user))
      .map((row) => ({
        nisn: row.nisn,
        nama: row.user?.nama ?? row.nisn,
        username: row.user?.username ?? '',
        password_default: row.nisn,
        akun_baru: false,
      }));
  }
}
