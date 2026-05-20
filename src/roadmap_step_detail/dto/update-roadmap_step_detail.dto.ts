import { PartialType } from '@nestjs/mapped-types';
import { CreateRoadmapStepDetailDto } from './create-roadmap_step_detail.dto';

export class UpdateRoadmapStepDetailDto extends PartialType(CreateRoadmapStepDetailDto) {}
