import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProgressDto {
  @IsIn(['belum', 'proses', 'selesai'])
  status!: 'belum' | 'proses' | 'selesai';

  @IsOptional()
  @IsString()
  progress_note?: string;
}
