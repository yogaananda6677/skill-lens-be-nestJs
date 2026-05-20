import { IsInt, Min } from 'class-validator';

export class SelectRoadmapDto {
  @IsInt()
  @Min(1)
  id_roadmap!: number;
}
