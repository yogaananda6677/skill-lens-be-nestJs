import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Jurusan } from './entities/jurusan.entity';
import { Sekolah } from '../sekolah/entities/sekolah.entity';

@Injectable()
export class JurusanService {
  constructor(
    @InjectRepository(Jurusan)
    private readonly jurusanRepo: Repository<Jurusan>,
    @InjectRepository(Sekolah)
    private readonly sekolahRepo: Repository<Sekolah>,
  ) {}

  async findAll(sekolahId?: number) {
    const where = sekolahId ? { id_sekolah: sekolahId } : undefined;
    const rows = await this.jurusanRepo.find({
      where,
      relations: ['sekolah'],
      order: { nama_jurusan: 'ASC' },
    });
    return rows.map((row) => ({
      id: String(row.id_jurusan),
      backendId: row.id_jurusan,
      name: row.nama_jurusan,
      schoolId: row.id_sekolah,
      schoolName: row.sekolah?.nama_sekolah ?? '-',
    }));
  }

  async create(data: any) {
    const namaJurusan = String(
      data?.nama_jurusan ?? data?.namaJurusan ?? data?.name ?? '',
    ).trim();
    const idSekolah = Number(data?.id_sekolah ?? data?.sekolahId ?? 0);

    if (!namaJurusan || !idSekolah) {
      throw new BadRequestException('Nama jurusan dan sekolah wajib diisi.');
    }

    const sekolah = await this.sekolahRepo.findOne({
      where: { id_sekolah: idSekolah },
    });
    if (!sekolah) throw new NotFoundException('Sekolah tidak ditemukan.');

    const row = await this.jurusanRepo.save(
      this.jurusanRepo.create({
        nama_jurusan: namaJurusan,
        id_sekolah: idSekolah,
        sekolah,
      }),
    );

    return {
      id: String(row.id_jurusan),
      backendId: row.id_jurusan,
      name: row.nama_jurusan,
      schoolId: row.id_sekolah,
      schoolName: sekolah.nama_sekolah,
    };
  }
}
