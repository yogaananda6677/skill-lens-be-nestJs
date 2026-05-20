import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminSchoolDto {
  @IsNotEmpty({ message: 'Nama sekolah wajib diisi.' })
  @IsString()
  @MaxLength(120)
  nama_sekolah!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  npsn?: string;

  @IsNotEmpty({ message: 'Jenis sekolah wajib diisi.' })
  @IsIn(['SMA', 'SMK'], {
       message: 'Jenis sekolah harus SMA, SMK.',
  })
  jenis_sekolah!: string;

  @IsOptional()
  @IsString()
  alamat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  kota?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provinsi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  no_telp?: string;
}``