import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SiswaTag } from './entities/siswa_tag.entity';
import { CreateSiswaTagDto } from './dto/create-siswa_tag.dto';
import { UpdateSiswaTagDto } from './dto/update-siswa_tag.dto';

@Injectable()
export class SiswaTagService {
  constructor(
    @InjectRepository(SiswaTag)
    private readonly siswaTagRepo: Repository<SiswaTag>,
  ) {}

  async create(createSiswaTagDto: CreateSiswaTagDto) {
    const data = this.siswaTagRepo.create({
      id_profile_siswa: createSiswaTagDto.id_profile_siswa,
      id_master_tag: createSiswaTagDto.id_master_tag,
    } as any);

    return this.siswaTagRepo.save(data);
  }

  async findAll() {
    return this.siswaTagRepo.find({
      relations: ['profileSiswa', 'masterTag'],
    });
  }

  async findOne(id: number) {
    const data = await this.siswaTagRepo.findOne({
      where: { id_siswa_tag: id } as any,
      relations: ['profileSiswa', 'masterTag'],
    });

    if (!data) {
      throw new NotFoundException('Data siswa tag tidak ditemukan.');
    }

    return data;
  }

  async update(id: number, updateSiswaTagDto: UpdateSiswaTagDto) {
    const data = await this.findOne(id);

    Object.assign(data, {
      id_profile_siswa:
        updateSiswaTagDto.id_profile_siswa ?? (data as any).id_profile_siswa,
      id_master_tag:
        updateSiswaTagDto.id_master_tag ?? (data as any).id_master_tag,
    });

    return this.siswaTagRepo.save(data);
  }

  async remove(id: number) {
    const data = await this.findOne(id);
    await this.siswaTagRepo.remove(data);

    return {
      message: 'Data siswa tag berhasil dihapus.',
    };
  }
}