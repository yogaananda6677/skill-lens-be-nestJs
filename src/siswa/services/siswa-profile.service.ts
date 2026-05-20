import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MasterTag, MasterTagTipe } from '../../master_tags/entities/master_tag.entity';
import { NilaiKategoriSiswa } from '../../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { ProfileSiswa } from '../../profile_siswa/entities/profile_siswa.entity';
import { SiswaTag } from '../../siswa_tag/entities/siswa_tag.entity';
import { Siswa } from '../entities/siswa.entity';
import { normalizeKey, toStringArray, uniqueClean } from '../utils/student-normalizer';

type ProfileTagPayload = Record<MasterTagTipe, string[]>;

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
  ) {}

  async getMe(userId: number) {
    const siswa = await this.findSiswaByUserId(userId, [
      'user',
      'sekolah',
      'jurusan_detail',
    ]);

    const [profile, nilaiKategori] = await Promise.all([
      this.profileRepo.findOne({ where: { id_siswa: siswa.id_siswa } }),
      this.kategoriRepo.find({ where: { id_siswa: siswa.id_siswa } }),
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
      tags
        .filter((item) => item.masterTag?.tipe === kategori)
        .map((item) => item.masterTag.mapped_key);

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
      prestasi: tagByKategori('prestasi'),
      prestasi_text: profile?.prestasi ?? '',
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

    const prestasi = toStringArray(body?.prestasi);
    profile.prestasi =
      prestasi.join(', ') || String(body?.prestasi_text ?? '').trim() || null;
    profile.tujuan_karir =
      String(body?.tujuan_karir ?? body?.tujuan ?? '').trim() || null;

    const saved = await this.profileRepo.save(profile);

    await this.replaceProfileTags(saved.id_profile_siswa, {
      minat: toStringArray(body?.minat),
      hobi: toStringArray(body?.hobi),
      bakat: toStringArray(body?.bakat),
      pengalaman: toStringArray(body?.pengalaman),
      prestasi,
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

      for (const [kategori, values] of Object.entries(tagsByKategori) as Array<[
        MasterTagTipe,
        string[],
      ]>) {
        for (const namaTag of uniqueClean(values)) {
          const mappedKey = normalizeKey(namaTag).replace(/\s+/g, '_');
          let masterTag = await manager.findOne(MasterTag, {
            where: {
              mapped_key: mappedKey,
              tipe: kategori,
              is_active: 1,
            },
          });

          if (!masterTag) {
            masterTag = await manager.save(
              MasterTag,
              manager.create(MasterTag, {
                label: namaTag,
                mapped_key: mappedKey,
                tipe: kategori,
                kategori_hint: null,
                sort_order: 0,
                is_active: 1,
              }),
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
}
