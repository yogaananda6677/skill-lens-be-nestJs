import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateSiswaTagDto {
  @Type(() => Number)
  @IsInt({ message: 'id_profile_siswa harus berupa angka.' })
  @Min(1, { message: 'id_profile_siswa tidak valid.' })
  id_profile_siswa!: number;

  @Type(() => Number)
  @IsInt({ message: 'id_master_tag harus berupa angka.' })
  @Min(1, { message: 'id_master_tag tidak valid.' })
  id_master_tag!: number;
}