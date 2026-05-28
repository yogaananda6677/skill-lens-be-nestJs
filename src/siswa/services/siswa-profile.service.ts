import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  MasterTag,
  MasterTagTipe,
} from '../../master_tags/entities/master_tag.entity';
import { NilaiKategoriSiswa } from '../../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { NilaiSiswa } from '../../nilai_siswa/entities/nilai_siswa.entity';
import { NILAI_AKADEMIK_CATEGORIES } from '../../nilai_siswa/constants/academic-categories';
import type { AcademicCategory } from '../../nilai_siswa/constants/academic-categories';
import { NilaiSiswaService } from '../../nilai_siswa/nilai_siswa.service';
import { PrestasiSiswa } from '../../prestasi_siswa/entities/prestasi_siswa.entity';
import { ProfileSiswa } from '../../profile_siswa/entities/profile_siswa.entity';
import { SiswaTag } from '../../siswa_tag/entities/siswa_tag.entity';
import { Siswa } from '../entities/siswa.entity';
import { toStringArray, uniqueClean } from '../utils/student-normalizer';

type ProfileTagPayload = Partial<
  Record<Exclude<MasterTagTipe, 'prestasi'>, string[]>
>;

const PROFILE_CHOICE_MIN = 1;
const PROFILE_CHOICE_MAX = 4;
const PROFILE_CHOICE_LABELS: Record<Exclude<MasterTagTipe, 'prestasi'>, string> = {
  minat: 'Minat',
  hobi: 'Hobi',
  bakat: 'Bakat',
  pengalaman: 'Pengalaman',
};

@Injectable()
export class SiswaProfileService {
  constructor(
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,

    @InjectRepository(ProfileSiswa)
    private readonly profileRepo: Repository<ProfileSiswa>,

    @InjectRepository(NilaiKategoriSiswa)
    private readonly kategoriRepo: Repository<NilaiKategoriSiswa>,

    private readonly nilaiSiswaService: NilaiSiswaService,

    @InjectRepository(SiswaTag)
    private readonly siswaTagRepo: Repository<SiswaTag>,

    @InjectRepository(PrestasiSiswa)
    private readonly prestasiRepo: Repository<PrestasiSiswa>,

    private readonly dataSource: DataSource,
  ) {}

  async getMe(userId: number) {
    const siswa = await this.findSiswaByUserId(userId, [
      'user',
      'sekolah',
      'jurusan_detail',
    ]);

    // Nilai kategori akademik baru dibuat/diperbarui saat siswa membuka dashboard/profil.
    // Import Excel hanya menyimpan nilai mentah agar proses import lebih ringan.
    try {
      await this.nilaiSiswaService.ensureNilaiKategoriForSiswa(
        siswa.id_siswa,
        true,
      );
    } catch (err) {
      // Siswa yang belum punya nilai mentah tetap boleh membuka profil.
      // Nilai akademik akan tampil kosong sampai admin mengimport nilai.
      if (!(err instanceof NotFoundException)) {
        throw err;
      }
    }

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
      must_change_password: siswa.user?.must_change_password === 1,
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



  async getNilaiAkademikDetail(userId: number) {
    const siswa = await this.findSiswaByUserId(userId, ['user']);

    const nilaiRows = await this.dataSource
      .getRepository(NilaiSiswa)
      .find({
        where: {
          id_siswa: siswa.id_siswa,
        },
        relations: [
          'kurikulum_mapel',
          'kurikulum_mapel.semester',
          'kurikulum_mapel.mata_pelajaran',
        ],
        order: {
          id_nilai: 'ASC',
        } as any,
      });

    const semesterMap = new Map<
      number,
      {
        semester: number;
        kategori: Record<
          AcademicCategory,
          {
            kategori: AcademicCategory;
            label: string;
            total: number;
            jumlah_mapel: number;
            rata_rata: number | null;
            mapel: string[];
          }
        >;
      }
    >();

    const getOrCreateSemesterBucket = (semester: number) => {
      let bucket = semesterMap.get(semester);

      if (!bucket) {
        const kategori = NILAI_AKADEMIK_CATEGORIES.reduce((acc, item) => {
          acc[item] = {
            kategori: item,
            label: this.labelKategoriNilai(item),
            total: 0,
            jumlah_mapel: 0,
            rata_rata: null,
            mapel: [],
          };

          return acc;
        }, {} as Record<AcademicCategory, {
          kategori: AcademicCategory;
          label: string;
          total: number;
          jumlah_mapel: number;
          rata_rata: number | null;
          mapel: string[];
        }>);

        bucket = {
          semester,
          kategori,
        };

        semesterMap.set(semester, bucket);
      }

      return bucket;
    };

    const data = nilaiRows
      .map((row) => {
        const kurikulum = row.kurikulum_mapel;
        const mapel = kurikulum?.mata_pelajaran;
        const namaMapel = String(mapel?.nama_mapel ?? '').trim();

        if (!namaMapel) {
          return null;
        }

        const semester =
          mapel?.semester ??
          this.parseSemesterNumber(kurikulum?.semester?.nama_semester) ??
          this.parseSemesterNumber((kurikulum as any)?.semester?.nama_semester) ??
          0;

        const kategori = (mapel?.kategori || 'softskill') as AcademicCategory;
        const nilai = Number(row.nilai || 0);

        const bucket = getOrCreateSemesterBucket(semester);
        const categoryBucket = bucket.kategori[kategori];

        categoryBucket.total += nilai;
        categoryBucket.jumlah_mapel += 1;
        categoryBucket.mapel.push(namaMapel);

        return {
          id_nilai: row.id_nilai,
          id_kurikulum_mapel:
            row.id_kurikulum_mapel ?? kurikulum?.id_kurikulum_mapel,
          nama_mapel: namaMapel,
          nilai,
          semester,
          kategori,
          kategori_label: this.labelKategoriNilai(kategori),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (a.semester !== b.semester) {
          return a.semester - b.semester;
        }

        return a.nama_mapel.localeCompare(b.nama_mapel);
      });

    const perSemester = Array.from(semesterMap.values())
      .sort((a, b) => a.semester - b.semester)
      .map((semesterItem) => {
        let totalNilai = 0;
        let totalMapel = 0;

        const kategori = NILAI_AKADEMIK_CATEGORIES.reduce((acc, item) => {
          const bucket = semesterItem.kategori[item];
          const rataRata = bucket.jumlah_mapel
            ? Number((bucket.total / bucket.jumlah_mapel).toFixed(2))
            : null;

          if (bucket.jumlah_mapel) {
            totalNilai += bucket.total;
            totalMapel += bucket.jumlah_mapel;
          }

          acc[item] = {
            kategori: bucket.kategori,
            label: bucket.label,
            rata_rata: rataRata,
            jumlah_mapel: bucket.jumlah_mapel,
            mapel: bucket.mapel.sort(),
          };

          return acc;
        }, {} as Record<
          AcademicCategory,
          {
            kategori: AcademicCategory;
            label: string;
            rata_rata: number | null;
            jumlah_mapel: number;
            mapel: string[];
          }
        >);

        return {
          semester: semesterItem.semester,
          kategori,
          rata_rata: totalMapel ? Number((totalNilai / totalMapel).toFixed(2)) : null,
          jumlah_mapel: totalMapel,
        };
      });

    const semesterOptions = perSemester.map((item) => item.semester);
    const totalNilai = data.reduce((sum: number, item: any) => sum + Number(item.nilai || 0), 0);
    const jumlahMapel = data.length;

    return {
      data,
      per_semester: perSemester,
      semester_options: semesterOptions,
      summary: {
        rata_rata: jumlahMapel ? Number((totalNilai / jumlahMapel).toFixed(2)) : null,
        jumlah_mapel: jumlahMapel,
        semester_terbaru: semesterOptions.length ? semesterOptions[semesterOptions.length - 1] : null,
      },
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

    const normalizedTags = {
      minat: this.normalizeProfileChoice('minat', body?.minat),
      hobi: this.normalizeProfileChoice('hobi', body?.hobi),
      bakat: this.normalizeProfileChoice('bakat', body?.bakat),
      pengalaman: this.normalizeProfileChoice('pengalaman', body?.pengalaman),
    };

    const saved = await this.profileRepo.save(profile);

    await this.replaceProfileTags(saved.id_profile_siswa, normalizedTags);

    return {
      message: 'Profil siswa berhasil disimpan.',
      data: {
        id_profile_siswa: saved.id_profile_siswa,
        id_siswa: saved.id_siswa,
      },
    };
  }

  private normalizeProfileChoice(
    kategori: Exclude<MasterTagTipe, 'prestasi'>,
    value: unknown,
  ) {
    const values = uniqueClean(toStringArray(value));
    const label = PROFILE_CHOICE_LABELS[kategori] ?? kategori;

    if (values.length < PROFILE_CHOICE_MIN) {
      throw new BadRequestException(
        `${label} wajib diisi minimal ${PROFILE_CHOICE_MIN}.`,
      );
    }

    if (values.length > PROFILE_CHOICE_MAX) {
      throw new BadRequestException(
        `${label} maksimal ${PROFILE_CHOICE_MAX} pilihan.`,
      );
    }

    return values;
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



  private parseSemesterNumber(value?: string | number | null) {
    const match = String(value ?? '').match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  private labelKategoriNilai(kategori: string) {
    const labels: Record<string, string> = {
      numerik: 'Numerik',
      bahasa: 'Bahasa',
      sains: 'Sains',
      sosial: 'Sosial',
      teknologi: 'Teknologi',
      agama: 'Agama',
      kreativitas: 'Kreativitas',
      softskill: 'Softskill/P5',
    };

    return labels[kategori] || kategori;
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
