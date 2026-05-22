import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  MasterTag,
  MasterTagTipe,
} from '../../master_tags/entities/master_tag.entity';
import { NilaiKategoriSiswa } from '../../nilai_siswa/entities/nilai_kategori_siswa.entity';
import { ProfileSiswa } from '../../profile_siswa/entities/profile_siswa.entity';
import { SiswaTag } from '../../siswa_tag/entities/siswa_tag.entity';
import { PrestasiSiswa } from '../../prestasi_siswa/entities/prestasi_siswa.entity';
import { Siswa } from '../entities/siswa.entity';
import {
  normalizeKey,
  toStringArray,
  uniqueClean,
} from '../utils/student-normalizer';

type ProfileTagPayload = Partial<
  Record<Exclude<MasterTagTipe, 'prestasi'>, string[]>
>;

const TAG_ALIAS_EXACT: Record<string, string> = {
  'ui ux design': 'ui ux',
  'ui ux designer': 'ui ux',
  'desain ui': 'ui ux',
  'desain ux': 'ui ux',
  'ui engineering': 'frontend',
  figma: 'ui ux',
  wireframe: 'ui ux',
  prototyping: 'ui ux',
  'desain grafis': 'desain',
  'desain poster': 'desain',
  'desain presentasi': 'desain',
  'komunikasi visual': 'desain',
  'desain komunikasi visual': 'desain',
  dkv: 'desain',
  'ilustrasi digital': 'ilustrasi',
  'motion graphics': 'motion graphic',
  'editing video': 'editing',
  'membuat desain figma': 'ui ux',
  'pengembangan web': 'web',
  'membuat website': 'web',
  website: 'web',
  'pengembangan mobile': 'mobile',
  'membuat aplikasi kecil': 'aplikasi',
  'kecerdasan buatan': 'machine learning',
  'analisis data': 'data',
  'database design': 'database',
  'keamanan siber': 'cyber security',
  'internet of things': 'iot',
  'cloud computing': 'cloud',
  'devops dasar': 'devops',
  'quality assurance': 'qa testing',
  'hukum dasar': 'hukum',
  'dokumentasi hukum': 'hukum',
  'ilmu hukum': 'hukum',
  'kebijakan publik': 'politik',
  'public speaking': 'public speaking',
  'latihan debat': 'debat',
  'copywriting kreatif': 'copywriting',
  'social media marketing': 'marketing',
  'pemasaran digital': 'marketing',
  'e commerce': 'ecommerce',
  'e-commerce': 'ecommerce',
  kewirausahaan: 'wirausaha',
  'bisnis digital': 'bisnis',
  'keuangan pribadi': 'keuangan',
  'manajemen event': 'event',
  'layanan pelanggan': 'customer relation',
  'administrasi perkantoran': 'administrasi perkantoran',
  'matematika terapan': 'matematika',
  'fisika terapan': 'fisika',
  'kimia terapan': 'kimia',
  'laboratorium sains': 'laboratorium',
  'pangan dan gizi': 'gizi',
  'kesehatan masyarakat': 'kesehatan masyarakat',
  'konseling teman sebaya': 'konseling',
  'pelayanan sosial': 'sosial',
  'pendidikan anak': 'pendidikan',
  'relawan komunitas': 'relawan',
  'komunikasi kesehatan': 'komunikasi',
  'mengajar teman': 'mengajar',
  'membuat modul belajar': 'materi ajar',
  'pelatihan komputer': 'komputer',
  'media pembelajaran': 'teknologi pendidikan',
  'bimbingan karier': 'konseling',
};

const TAG_ALIAS_CONTAINS: Array<[string[], string]> = [
  [['ui', 'ux'], 'ui ux'],
  [['desain', 'ui'], 'ui ux'],
  [['desain', 'ux'], 'ui ux'],
  [['figma'], 'ui ux'],
  [['wireframe'], 'ui ux'],
  [['prototype'], 'ui ux'],
  [['desain', 'grafis'], 'desain'],
  [['desain', 'poster'], 'desain'],
  [['komunikasi', 'visual'], 'desain'],
  [['ilustrasi'], 'ilustrasi'],
  [['motion', 'graphic'], 'motion graphic'],
  [['editing', 'video'], 'editing'],
  [['pengembangan', 'web'], 'web'],
  [['membuat', 'website'], 'web'],
  [['web', 'developer'], 'web'],
  [['mobile'], 'mobile'],
  [['coding'], 'coding'],
  [['pemrograman'], 'pemrograman'],
  [['database'], 'database'],
  [['hukum'], 'hukum'],
  [['legal'], 'hukum'],
  [['public', 'speaking'], 'public speaking'],
  [['debat'], 'debat'],
];

function canonicalTagKey(value: unknown): string {
  const normalized = normalizeKey(value);
  if (!normalized) return '';
  if (TAG_ALIAS_EXACT[normalized]) return TAG_ALIAS_EXACT[normalized];
  const containsAlias = TAG_ALIAS_CONTAINS.find(([keywords]) =>
    keywords.every((keyword) => normalized.includes(keyword)),
  );
  return containsAlias?.[1] ?? normalized;
}

function inferKategoriHint(mappedKey: string): string | null {
  const key = normalizeKey(mappedKey);
  if ([
    'desain', 'ui ux', 'ilustrasi', 'menggambar', 'editing', 'fotografi',
    'videografi', 'animasi', 'branding', 'kreatif', 'motion graphic',
    'desain produk', 'multimedia',
  ].includes(key)) return 'kreatif';
  if ([
    'pemrograman', 'coding', 'web', 'aplikasi', 'mobile', 'database',
    'frontend', 'backend', 'komputer', 'software', 'machine learning',
    'cyber security', 'iot', 'cloud', 'qa testing',
  ].includes(key)) return 'teknologi';
  if ([
    'hukum', 'debat', 'public speaking', 'politik', 'administrasi publik',
    'komunikasi', 'psikologi', 'sosial', 'jurnalistik',
  ].includes(key)) return 'sosial';
  if ([
    'bisnis', 'wirausaha', 'marketing', 'akuntansi', 'keuangan', 'jualan',
    'manajemen', 'ecommerce', 'marketplace',
  ].includes(key)) return 'bisnis';
  if ([
    'matematika', 'biologi', 'kimia', 'fisika', 'riset', 'kesehatan',
    'laboratorium', 'farmasi', 'gizi',
  ].includes(key)) return 'sains';
  if ([
    'otomotif', 'mekanik', 'masak', 'barista', 'menjahit', 'hospitality',
    'berkebun', 'peternakan', 'praktik',
  ].includes(key)) return 'praktik';
  if ([
    'agama', 'dakwah', 'tahfidz', 'mengaji', 'pai', 'syariah', 'fikih',
    'zakat', 'wakaf',
  ].includes(key)) return 'agama';
  return null;
}


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
      tags
        .filter((item) => item.masterTag?.tipe === kategori)
        .map((item) => item.masterTag?.mapped_key || item.masterTag?.label)
        .filter(Boolean);

    const prestasi = prestasiRows.map((item) => ({
      id: item.id_prestasi,
      id_prestasi: item.id_prestasi,
      nama_prestasi: item.nama_prestasi,
      tahun: item.tahun,
      tingkat: item.tingkat,
      penyelenggara: item.penyelenggara,
      keterangan: item.keterangan,
      bukti_url: item.bukti_url,
    }));

    /**
     * Ini khusus untuk kebutuhan SPK.
     * SPK cukup menerima prestasi dalam bentuk ringkasan string.
     */
    const prestasiSpk = prestasiRows.map((item) =>
      [
        item.nama_prestasi,
        item.tingkat,
        item.tahun,
        item.penyelenggara,
      ]
        .filter(Boolean)
        .join(' - '),
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

      /**
       * Prestasi sekarang dari tabel prestasi_siswa,
       * bukan dari siswa_tag/master_tag.
       */
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

    /**
     * Prestasi tidak diambil dari body lagi.
     * Prestasi punya tabel sendiri.
     */
    const prestasiRows = await this.prestasiRepo.find({
      where: { id_siswa: siswa.id_siswa },
      order: {
        tahun: 'DESC',
        id_prestasi: 'DESC',
      } as any,
    });

    const prestasiText = prestasiRows
      .map((item) =>
        [item.nama_prestasi, item.tingkat, item.tahun]
          .filter(Boolean)
          .join(' - '),
      )
      .join(', ');

    /**
     * Kalau kolom profile.prestasi masih ada, isi hanya untuk backward compatibility.
     * Sumber data utama tetap tabel prestasi_siswa.
     */

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
        for (const namaTag of uniqueClean(values)) {
          const inputKey = normalizeKey(namaTag);
          const mappedKey = canonicalTagKey(namaTag);
          if (!mappedKey) continue;

          const candidates = await manager.find(MasterTag, {
            where: {
              tipe: kategori,
              is_active: 1,
            },
          });

          let masterTag = candidates.find((item) => {
            const itemMappedKey = normalizeKey(item.mapped_key);
            const itemLabelKey = normalizeKey(item.label);
            return (
              itemMappedKey === mappedKey ||
              itemMappedKey === inputKey ||
              itemLabelKey === mappedKey ||
              itemLabelKey === inputKey
            );
          });

          if (!masterTag) {
            masterTag = await manager.save(
              MasterTag,
              manager.create(MasterTag, {
                label: namaTag,
                mapped_key: mappedKey,
                tipe: kategori,
                kategori_hint: inferKategoriHint(mappedKey),
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