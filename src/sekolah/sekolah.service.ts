import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sekolah } from './entities/sekolah.entity';

export type SchoolResponse = {
  id: string;
  backendId: number;
  name: string;
  level: string;
  city: string;
  accreditation: string;
  address: string;
  totalStudents: number;
  status: string;
};

@Injectable()
export class SekolahService {
  constructor(
    @InjectRepository(Sekolah)
    private readonly sekolahRepo: Repository<Sekolah>,
  ) {}

  async findAll(): Promise<SchoolResponse[]> {
    const rows = await this.sekolahRepo.find({
      order: { nama_sekolah: 'ASC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async findApproved(): Promise<SchoolResponse[]> {
    const rows = await this.sekolahRepo.find({
      where: { status_verifikasi: 'approved' },
      order: { nama_sekolah: 'ASC' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async create(data: any) {
    const namaSekolah = String(
      data?.nama_sekolah ?? data?.namaSekolah ?? '',
    ).trim();
    const jenisSekolah = String(data?.jenis_sekolah ?? data?.jenisSekolah ?? '')
      .trim()
      .toUpperCase();

    if (!namaSekolah || !['SMA', 'SMK'].includes(jenisSekolah)) {
      throw new BadRequestException(
        'Nama sekolah dan jenis sekolah wajib diisi.',
      );
    }

    const row = await this.sekolahRepo.save(
      this.sekolahRepo.create({
        nama_sekolah: namaSekolah,
        npsn: data?.npsn ? String(data.npsn).trim() : null,
        alamat: data?.alamat ? String(data.alamat).trim() : null,
        no_hp_sekolah: data?.no_hp_sekolah
          ? String(data.no_hp_sekolah).trim()
          : null,
        jenis_sekolah: jenisSekolah as 'SMA' | 'SMK',
        status_verifikasi:
          data?.status_verifikasi === 'approved' ? 'approved' : 'pending',
      }),
    );

    return this.toResponse(row);
  }

  private toResponse(row: Sekolah): SchoolResponse {
    return {
      id: String(row.id_sekolah),
      backendId: row.id_sekolah,
      name: row.nama_sekolah,
      level: row.jenis_sekolah ?? '-',
      city: this.extractCity(row.alamat),
      accreditation:
        row.status_verifikasi === 'approved'
          ? 'Terverifikasi'
          : 'Menunggu verifikasi',
      address: row.alamat ?? '-',
      totalStudents: 0,
      status: row.status_verifikasi,
    };
  }

  private extractCity(address?: string | null) {
    if (!address) return '-';
    const parts = address
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return parts.at(-1) ?? '-';
  }
}
