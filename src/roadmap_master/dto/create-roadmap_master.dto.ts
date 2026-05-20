import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoadmapMasterDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsIn(['kuliah', 'kerja', 'wirausaha', 'umum'])
  target_type?: 'kuliah' | 'kerja' | 'wirausaha' | 'umum';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recommended_for?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
