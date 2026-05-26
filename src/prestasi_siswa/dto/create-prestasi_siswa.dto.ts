import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePrestasiSiswaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_siswa?: number;

  @IsString()
  @MaxLength(150)
  nama_prestasi!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  tahun?: string | null;

  /** Kolom lama, masih boleh dipakai untuk tampilan. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tingkat?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  penyelenggara?: string | null;

  @IsOptional()
  @IsString()
  keterangan?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bukti_url?: string | null;

  /** Field terstruktur untuk engine SPK. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  level_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  rank_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  type_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mapped_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  kategori_hint?: string | null;
}
