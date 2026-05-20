import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdminTeacherDto {
  @IsNotEmpty({ message: 'Nama guru wajib diisi.' })
  @IsString()
  @MaxLength(100)
  nama!: string;

  @IsNotEmpty({ message: 'Email guru wajib diisi.' })
  @IsEmail({}, { message: 'Format email guru tidak valid.' })
  @MaxLength(120)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  no_hp?: string;

  @IsNotEmpty({ message: 'Username guru wajib diisi.' })
  @IsString()
  @MinLength(5, { message: 'Username minimal 5 karakter.' })
  @MaxLength(30)
  username!: string;

  @IsNotEmpty({ message: 'NIP/NUPTK wajib diisi.' })
  @IsString()
  @MinLength(5, { message: 'NIP/NUPTK minimal 5 karakter.' })
  @MaxLength(40)
  nip!: string;

  @IsNotEmpty({ message: 'Jabatan wajib diisi.' })
  @IsIn(
    ['Guru BK', 'Wali Kelas', 'Kepala Program Keahlian', 'Guru Mata Pelajaran'],
    { message: 'Jabatan guru tidak valid.' },
  )
  jabatan!: string;
}