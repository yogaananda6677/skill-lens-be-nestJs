import { IsInt, IsOptional, IsString, MaxLength, Min, IsUrl } from 'class-validator';

export class CreateRoadmapStepDetailDto {
  @IsInt()
  @Min(1)
  id_roadmap_step!: number;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'reference_link harus berupa URL lengkap.' })
  reference_link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  detail_order?: number;
}
