import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  MasterTag,
  MasterTagTipe,
} from '../../master_tags/entities/master_tag.entity';
import { NilaiKategoriSiswa } from '../../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { PrestasiSiswa } from '../../prestasi_siswa/entities/prestasi_siswa.entity';
import { ProfileSiswa } from '../../profile_siswa/entities/profile_siswa.entity';
import { SiswaTag } from '../../siswa_tag/entities/siswa_tag.entity';
import { Siswa } from '../entities/siswa.entity';
import { toStringArray, uniqueClean } from '../utils/student-normalizer';

type ProfileTagPayload = Partial<
  Record<Exclude<MasterTagTipe, 'prestasi'>, string[]>
>;

@Injectable()
export class SiswaProfileService {
  constructor(
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,

    @InjectRepository(ProfileSiswa)
    private readonly profileRepo: Repository<ProfileSiswa>,

    @InjectRepository(NilaiKategoriSiswa)
    private readonly kategoriRepo: Repository<NilaiKategoriSiswa>,

    @InjectRepository(SiswaTag)
    private readonly siswaTagRepo: Repository<SiswaTag>,

    @InjectRepository(PrestasiSiswa)
    private readonly prestasiRepo: Repository<PrestasiSiswa>,
  ) {}

  async getMe(userId: number) {
    const siswa = await this.findSiswaByUserId(userId, [
      'user',
      'sekolah',
      'jurusan_detail',
    ]);

    const [profile, nilaiKategori, prestasiRows] = await Promise.all([
      this.profileRepo.findOne({
        where: { id_siswa: siswa.id_siswa },
      }),

      this.kategoriRepo.find({
        where: { id_siswa: siswa.id_siswa },
      }),

      this.prestasiRepo.find({
        where: { id_siswa: siswa.id_siswa },
        order: {
          tahun: 'DESC',
          id_prestasi: 'DESC',
        } as any,
      }),
    ]);

    const nilaiAkademik = nilaiKategori.reduce(
      (acc, item) => {
        acc[item.kategori] = Number(item.nilai ?? 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const tags = profile
      ? await this.siswaTagRepo.find({
          where: { id_profile_siswa: profile.id_profile_siswa },
          relations: ['masterTag'],
        })
      : [];

    const tagByKategori = (kategori: MasterTagTipe) =>
      uniqueClean(
        tags
          .filter((item) => item.masterTag?.tipe === kategori && item.masterTag?.is_active === 1)
          .map((item) => item.masterTag?.mapped_key || item.masterTag?.label)
          .filter(Boolean) as string[],
      );

    const prestasi = prestasiRows.map((item) => ({
      id: item.id_prestasi,
      id_prestasi: item.id_prestasi,
      nama_prestasi: item.nama_prestasi,
      tahun: item.tahun,
      tingkat: item.tingkat,
      penyelenggara: item.penyelenggara,
      keterangan: item.keterangan,
      bukti_url: item.bukti_url,
      level_key: item.level_key,
      rank_key: item.rank_key,
      type_key: item.type_key,
      mapped_key: item.mapped_key,
      kategori_hint: item.kategori_hint,
    }));

    /**
     * Untuk SPK, prestasi dikirim sebagai mapped_key resmi.
     * Kalau data lama belum punya mapped_key, type_key dipakai sebagai fallback.
     * Nama prestasi hanya fallback terakhir untuk kompatibilitas data lama.
     */
    const prestasiSpk = uniqueClean(
      prestasiRows
        .map((item) => item.mapped_key || item.type_key || item.nama_prestasi)
        .filter(Boolean) as string[],
    );

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
            jenis_sekolah: siswa.sekolah.jenis_sekolah,
          }
        : null,

      minat: tagByKategori('minat'),
      hobi: tagByKategori('hobi'),
      bakat: tagByKategori('bakat'),
      pengalaman: tagByKategori('pengalaman'),

      prestasi,
      prestasi_spk: prestasiSpk,
      prestasi_text: prestasiSpk.join(', '),

      tujuan: profile?.tujuan_karir ?? '',
      nilai_akademik: nilaiAkademik,
    };
  }

  async updateProfil(userId: number, body: any) {
    const siswa = await this.findSiswaByUserId(userId, ['user']);

    let profile = await this.profileRepo.findOne({
      where: { id_siswa: siswa.id_siswa },
    });

    if (!profile) {
      profile = this.profileRepo.create({
        id_siswa: siswa.id_siswa,
        siswa,
      });
    }

    profile.tujuan_karir =
      String(body?.tujuan_karir ?? body?.tujuan ?? '').trim() || null;

    const saved = await this.profileRepo.save(profile);

    await this.replaceProfileTags(saved.id_profile_siswa, {
      minat: toStringArray(body?.minat),
      hobi: toStringArray(body?.hobi),
      bakat: toStringArray(body?.bakat),
      pengalaman: toStringArray(body?.pengalaman),
    });

    return {
      message: 'Profil siswa berhasil disimpan.',
      data: {
        id_profile_siswa: saved.id_profile_siswa,
        id_siswa: saved.id_siswa,
      },
    };
  }

  private async findSiswaByUserId(userId: number, relations: string[]) {
    const siswa = await this.siswaRepo.findOne({
      where: { user: { id_user: userId } as any },
      relations,
    });

    if (!siswa) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    return siswa;
  }

  private async replaceProfileTags(
    idProfileSiswa: number,
    tagsByKategori: ProfileTagPayload,
  ) {
    await this.siswaTagRepo.manager.transaction(async (manager) => {
      await manager.delete(SiswaTag, { id_profile_siswa: idProfileSiswa });

      for (const [kategori, values] of Object.entries(tagsByKategori) as Array<
        [Exclude<MasterTagTipe, 'prestasi'>, string[]]
      >) {
        const requestedValues = uniqueClean(values);
        if (!requestedValues.length) continue;

        const candidates = await manager.find(MasterTag, {
          where: {
            tipe: kategori,
            is_active: 1,
          },
          order: {
            sort_order: 'ASC',
            id: 'ASC',
          } as any,
        });

        const byId = new Map<number, MasterTag>();
        const byLabel = new Map<string, MasterTag>();
        const byMappedKey = new Map<string, MasterTag>();

        for (const item of candidates) {
          byId.set(item.id, item);
          byLabel.set(this.lookupKey(item.label), item);
          if (!byMappedKey.has(this.lookupKey(item.mapped_key))) {
            byMappedKey.set(this.lookupKey(item.mapped_key), item);
          }
        }

        for (const rawValue of requestedValues) {
          const masterTag = this.resolveMasterTag(rawValue, byId, byLabel, byMappedKey);

          if (!masterTag) {
            throw new BadRequestException(
              `Tag "${rawValue}" tidak valid untuk kategori ${kategori}. Pilih tag dari master data.`,
            );
          }

          await manager.save(
            SiswaTag,
            manager.create(SiswaTag, {
              id_profile_siswa: idProfileSiswa,
              id_master_tag: masterTag.id,
            }),
          );
        }
      }
    });
  }

  private resolveMasterTag(
    rawValue: string,
    byId: Map<number, MasterTag>,
    byLabel: Map<string, MasterTag>,
    byMappedKey: Map<string, MasterTag>,
  ) {
    const asNumber = Number(rawValue);
    if (Number.isInteger(asNumber) && asNumber > 0 && String(asNumber) === String(rawValue).trim()) {
      return byId.get(asNumber) ?? null;
    }

    const key = this.lookupKey(rawValue);
    return byLabel.get(key) ?? byMappedKey.get(key) ?? null;
  }

  /**
   * Ini hanya sanitasi teknis untuk lookup, bukan normalisasi semantik.
   * Tidak ada alias seperti "figma -> ui ux" di backend.
   */
  private lookupKey(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }
}
