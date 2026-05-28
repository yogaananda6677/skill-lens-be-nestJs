import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

type ApiCoSchool = {
  npsn?: string;
  name?: string;
  grade?: string;
  status?: string;
  address?: string;
  province_code?: string;
  province_name?: string;
  province?: string;
  regency_code?: string;
  regency_name?: string;
  regency?: string;
  district_code?: string;
  district_name?: string;
  district?: string;
  accreditation?: string;
  lang?: string | number;
  long?: string | number;
};

@Injectable()
export class SchoolLookupService {
  private readonly apiUrl =
    process.env.SCHOOL_LOOKUP_API_URL ||
    'https://use.api.co.id/regional/indonesia/schools';

  private readonly apiKey = process.env.API_CO_ID_KEY || '';

  private readonly allowedTypes = [
    'SMA',
    'SMK',
    'MA',
    'MAK',
    'PAKET C',
    'PKBM',
    'SKB',
  ];

  async findByNpsn(npsn: string) {
    const cleanNpsn = String(npsn || '').replace(/\D/g, '').trim();

    if (!/^\d{8}$/.test(cleanNpsn)) {
      throw new BadRequestException('NPSN harus berisi 8 digit angka.');
    }

    const json = await this.fetchApiCo(`npsn=${encodeURIComponent(cleanNpsn)}`);
    const school = this.resolveFirstSchool(json);

    if (!school) {
      throw new NotFoundException('Data sekolah tidak ditemukan.');
    }

    const normalized = this.normalizeSchool(school);

    if (!normalized.npsn || !normalized.nama_sekolah) {
      throw new NotFoundException('Data sekolah tidak lengkap.');
    }

    if (!this.isAllowedSchoolType(normalized.jenis_sekolah)) {
      throw new BadRequestException(
        `Sekolah ${normalized.nama_sekolah} bukan SMA/SMK/sederajat.`,
      );
    }

    return {
      success: true,
      message: 'Data sekolah berhasil ditemukan.',
      data: normalized,
    };
  }

  async findSchools(query: {
    province_code?: string;
    regency_code?: string;
    district_code?: string;
    grade?: string;
    name?: string;
    status?: string;
    page?: string | number;
  }) {
    const params = new URLSearchParams();

    if (query.province_code) params.set('province_code', query.province_code);
    if (query.regency_code) params.set('regency_code', query.regency_code);
    if (query.district_code) params.set('district_code', query.district_code);
    if (query.name) params.set('name', query.name);
    if (query.status) params.set('status', query.status);

    const grade = String(query.grade || '').trim().toUpperCase();

    if (grade) {
      if (!this.isAllowedSchoolType(grade)) {
        throw new BadRequestException('Jenjang sekolah tidak sesuai.');
      }

      params.set('grade', grade);
    }

    params.set('page', String(query.page || 1));

    const json = await this.fetchApiCo(params.toString());
    const schools = this.resolveSchoolList(json);

    return {
      success: true,
      message: 'Data sekolah berhasil diambil.',
      data: schools
        .map((school) => this.normalizeSchool(school))
        .filter((school) => this.isAllowedSchoolType(school.jenis_sekolah)),
      paging: json?.paging || null,
    };
  }

  private async fetchApiCo(queryString: string) {
    if (!this.apiKey) {
      throw new BadGatewayException(
        'API_CO_ID_KEY belum diatur di env backend.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.apiUrl}?${queryString}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'x-api-co-id': this.apiKey,
        },
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new BadGatewayException(
          json?.message ||
            'Gagal mengambil data sekolah dari API eksternal.',
        );
      }

      if (json?.is_success === false) {
        throw new BadGatewayException(
          json?.message || 'API eksternal mengembalikan respons gagal.',
        );
      }

      return json;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        'API data sekolah sedang tidak bisa diakses. Coba lagi nanti.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveFirstSchool(json: any): ApiCoSchool | null {
    const data = json?.data;

    if (Array.isArray(data)) {
      return data[0] || null;
    }

    if (data && typeof data === 'object') {
      return data;
    }

    return null;
  }

  private resolveSchoolList(json: any): ApiCoSchool[] {
    if (Array.isArray(json?.data)) {
      return json.data;
    }

    if (json?.data && typeof json.data === 'object') {
      return [json.data];
    }

    return [];
  }

  private normalizeSchool(school: ApiCoSchool) {
    const npsn = this.cleanText(school.npsn);
    const namaSekolah = this.cleanText(school.name);
    const jenisSekolah = this.normalizeType(school.grade, namaSekolah);
    const statusSekolah = this.normalizeStatus(school.status);

    const provinsi = this.cleanText(school.province_name || school.province);
    const kabupatenKota = this.cleanText(
      school.regency_name || school.regency,
    );
    const kecamatan = this.cleanText(school.district_name || school.district);
    const alamatJalan = this.cleanText(school.address);

    const alamatSekolah = [
      alamatJalan,
      kecamatan,
      kabupatenKota,
      provinsi,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      npsn,
      nama_sekolah: namaSekolah,
      jenis_sekolah: jenisSekolah,
      status_sekolah: statusSekolah,

      // API ini tidak menyediakan telepon sekolah di endpoint dasar.
      // Jadi tetap kosong dan field FE tetap optional.
      no_hp_sekolah: null,
      no_telp: null,
      email_sekolah: null,

      alamat_sekolah: alamatSekolah,
      alamat: alamatSekolah,

      desa: null,
      kecamatan,
      kabupaten_kota: kabupatenKota,
      provinsi,

      province_code: this.cleanText(school.province_code),
      regency_code: this.cleanText(school.regency_code),
      district_code: this.cleanText(school.district_code),

      akreditasi: this.cleanPremiumValue(school.accreditation),
      latitude: this.cleanPremiumValue(school.lang),
      longitude: this.cleanPremiumValue(school.long),

      sumber: 'api.co.id',
    };
  }

  private cleanText(value: unknown) {
    const text = String(value ?? '').trim();
    return text.length ? text : null;
  }

  private cleanPremiumValue(value: unknown) {
    const text = String(value ?? '').trim();

    if (!text) return null;
    if (text.toLowerCase().includes('premium')) return null;
    if (text.toLowerCase().includes('available')) return null;

    return text;
  }

  private normalizeStatus(value: string | undefined | null) {
    const upper = String(value || '').trim().toUpperCase();

    if (!upper) return null;
    if (upper === 'N') return 'NEGERI';
    if (upper === 'S') return 'SWASTA';

    return upper;
  }

  private normalizeType(value: string | undefined | null, namaSekolah?: string | null) {
    const raw = `${value || ''} ${namaSekolah || ''}`.toUpperCase();

    if (raw.includes('SMK')) return 'SMK';
    if (raw.includes('SMA')) return 'SMA';
    if (raw.includes('MAK')) return 'MAK';
    if (raw.includes('PAKET C')) return 'PAKET C';
    if (raw.includes('PKBM')) return 'PKBM';
    if (raw.includes('SKB')) return 'SKB';

    const grade = String(value || '').trim().toUpperCase();

    if (grade === 'MA') return 'MA';
    if (grade.includes('MADRASAH ALIYAH')) return 'MA';

    return grade || null;
  }

  private isAllowedSchoolType(type: string | null) {
    if (!type) return false;

    const upper = type.toUpperCase();

    return this.allowedTypes.some((allowed) => upper.includes(allowed));
  }
}