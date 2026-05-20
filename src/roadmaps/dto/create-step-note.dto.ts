import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateStepNoteDto {
  @IsInt()
  @Min(1)
  id_student_roadmap!: number;

  @IsInt()
  @Min(1)
  id_roadmap_step!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsString()
  note!: string;

  @IsOptional()
  @IsString()
  follow_up?: string;

  @IsOptional()
  @IsBoolean()
  visible_to_student?: boolean;
}
