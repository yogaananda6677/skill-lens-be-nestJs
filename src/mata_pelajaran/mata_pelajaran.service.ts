import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { MataPelajaran } from './entities/mata_pelajaran.entity';

@Injectable()
export class MataPelajaranService {
  constructor(
    @InjectRepository(MataPelajaran)
    private mapelRepo: Repository<MataPelajaran>,
  ) {}

  async findAllBySekolah(id_sekolah?: number): Promise<MataPelajaran[]> {
    const conditions: any[] = [{ id_sekolah: IsNull(), is_default: true }];
    if (id_sekolah) conditions.push({ id_sekolah });
    return this.mapelRepo.find({ where: conditions, relations: ['jurusan'], order: { nama_mapel: 'ASC' } });
  }

  // ✅ TAMBAHKAN METHOD INI
  async findAllByJurusan(jurusanId: number): Promise<MataPelajaran[]> {
    return this.mapelRepo.find({
      where: [
        { tipe_mapel: 'umum', is_default: true },
        { tipe_mapel: 'jurusan', id_jurusan: jurusanId }
      ],
      order: { nama_mapel: 'ASC' }
    });
  }

  async findOne(id: number): Promise<MataPelajaran> {
    const mapel = await this.mapelRepo.findOne({ where: { id_mapel: id }, relations: ['jurusan'] });
    if (!mapel) throw new NotFoundException('Mata pelajaran tidak ditemukan');
    return mapel;
  }

  async create(data: Partial<MataPelajaran>): Promise<MataPelajaran> {
    if (data.tipe_mapel === 'umum' && !data.is_default) {
      throw new BadRequestException('Mata pelajaran umum hanya bisa ditambahkan melalui sistem');
    }
    const mapel = this.mapelRepo.create(data);
    return this.mapelRepo.save(mapel);
  }

  async update(id: number, data: Partial<MataPelajaran>): Promise<MataPelajaran> {
    const mapel = await this.findOne(id);
    if (mapel.is_default) throw new BadRequestException('Mata pelajaran default tidak dapat diubah');
    await this.mapelRepo.update(id, data);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const mapel = await this.findOne(id);
    if (mapel.is_default) throw new BadRequestException('Mata pelajaran default tidak dapat dihapus');
    await this.mapelRepo.delete(id);
  }
}