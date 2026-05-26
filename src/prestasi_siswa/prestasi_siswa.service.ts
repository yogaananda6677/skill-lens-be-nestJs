import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '../user/entities/user.entity';
import { Siswa } from '../siswa/entities/siswa.entity';
import { CreatePrestasiSiswaDto } from './dto/create-prestasi_siswa.dto';
import { UpdatePrestasiSiswaDto } from './dto/update-prestasi_siswa.dto';
import { PrestasiSiswa } from './entities/prestasi_siswa.entity';

type CurrentUser = {
  id_user: number;
  role: UserRole;
  id_sekolah?: number | null;
};

@Injectable()
export class PrestasiSiswaService {
  constructor(
    @InjectRepository(PrestasiSiswa)
    private readonly prestasiRepo: Repository<PrestasiSiswa>,

    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,
  ) {}

  async create(dto: CreatePrestasiSiswaDto, user: CurrentUser) {
    const idSiswa = await this.resolveTargetSiswaId(dto.id_siswa, user);

    const row = await this.prestasiRepo.save(
      this.prestasiRepo.create({
        id_siswa: idSiswa,
        nama_prestasi: this.requiredText(dto.nama_prestasi, 'Nama prestasi'),
        tahun: this.optionalText(dto.tahun),
        tingkat: this.optionalText(dto.tingkat),
        penyelenggara: this.optionalText(dto.penyelenggara),
        keterangan: this.optionalText(dto.keterangan),
        bukti_url: this.optionalText(dto.bukti_url),
        level_key: this.optionalKey(dto.level_key),
        rank_key: this.optionalKey(dto.rank_key),
        type_key: this.optionalKey(dto.type_key),
        mapped_key: this.optionalKey(dto.mapped_key ?? dto.type_key),
        kategori_hint: this.optionalKey(dto.kategori_hint),
      }),
    );

    return {
      message: 'Prestasi siswa berhasil ditambahkan.',
      data: row,
    };
  }

  async findAll(user: CurrentUser, idSiswa?: number) {
    const targetIdSiswa = user.role === 'siswa'
      ? await this.getSiswaIdFromUser(user.id_user)
      : Number(idSiswa || 0) || undefined;

    return this.prestasiRepo.find({
      where: targetIdSiswa ? { id_siswa: targetIdSiswa } : {},
      order: {
        tahun: 'DESC',
        id_prestasi: 'DESC',
      } as any,
    });
  }

  async findOne(id: number, user: CurrentUser) {
    const row = await this.prestasiRepo.findOne({
      where: { id_prestasi: id },
    });

    if (!row) {
      throw new NotFoundException('Prestasi siswa tidak ditemukan.');
    }

    await this.ensureCanAccess(row.id_siswa, user);
    return row;
  }

  async update(id: number, dto: UpdatePrestasiSiswaDto, user: CurrentUser) {
    const row = await this.findOne(id, user);
    const patch = dto as CreatePrestasiSiswaDto;

    if (patch.nama_prestasi !== undefined) {
      row.nama_prestasi = this.requiredText(patch.nama_prestasi, 'Nama prestasi');
    }

    if (patch.tahun !== undefined) row.tahun = this.optionalText(patch.tahun);
    if (patch.tingkat !== undefined) row.tingkat = this.optionalText(patch.tingkat);
    if (patch.penyelenggara !== undefined) row.penyelenggara = this.optionalText(patch.penyelenggara);
    if (patch.keterangan !== undefined) row.keterangan = this.optionalText(patch.keterangan);
    if (patch.bukti_url !== undefined) row.bukti_url = this.optionalText(patch.bukti_url);
    if (patch.level_key !== undefined) row.level_key = this.optionalKey(patch.level_key);
    if (patch.rank_key !== undefined) row.rank_key = this.optionalKey(patch.rank_key);
    if (patch.type_key !== undefined) row.type_key = this.optionalKey(patch.type_key);
    if (patch.mapped_key !== undefined) row.mapped_key = this.optionalKey(patch.mapped_key);
    if (patch.kategori_hint !== undefined) row.kategori_hint = this.optionalKey(patch.kategori_hint);

    /**
     * Kalau frontend baru hanya mengirim type_key, mapped_key minimal ikut type_key.
     * Untuk akurasi terbaik, frontend bisa mengisi mapped_key dari prestasi_type_weights.
     */
    if (!row.mapped_key && row.type_key) row.mapped_key = row.type_key;

    const saved = await this.prestasiRepo.save(row);

    return {
      message: 'Prestasi siswa berhasil diperbarui.',
      data: saved,
    };
  }

  async remove(id: number, user: CurrentUser) {
    const row = await this.findOne(id, user);
    await this.prestasiRepo.remove(row);

    return {
      message: 'Prestasi siswa berhasil dihapus.',
    };
  }

  private async resolveTargetSiswaId(idSiswa: number | undefined, user: CurrentUser) {
    if (user.role === 'siswa') {
      return this.getSiswaIdFromUser(user.id_user);
    }

    const parsedId = Number(idSiswa || 0);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      throw new BadRequestException('id_siswa wajib diisi.');
    }

    const siswa = await this.siswaRepo.findOne({
      where: { id_siswa: parsedId },
    });

    if (!siswa) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    return siswa.id_siswa;
  }

  private async getSiswaIdFromUser(userId: number) {
    const siswa = await this.siswaRepo.findOne({
      where: { user: { id_user: userId } as any },
    });

    if (!siswa) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    return siswa.id_siswa;
  }

  private async ensureCanAccess(idSiswa: number, user: CurrentUser) {
    if (user.role !== 'siswa') return;

    const ownIdSiswa = await this.getSiswaIdFromUser(user.id_user);
    if (ownIdSiswa !== idSiswa) {
      throw new ForbiddenException('Tidak boleh mengakses prestasi siswa lain.');
    }
  }

  private requiredText(value: unknown, label: string) {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new BadRequestException(`${label} wajib diisi.`);
    }
    return text;
  }

  private optionalText(value: unknown) {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private optionalKey(value: unknown) {
    const text = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    return text || null;
  }
}
