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
}
