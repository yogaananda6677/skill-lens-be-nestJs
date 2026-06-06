import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRoadmapStepDto {
  @IsInt()
  @Min(1)
  id_roadmap!: number;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  step_order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  estimated_duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  output_target?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

