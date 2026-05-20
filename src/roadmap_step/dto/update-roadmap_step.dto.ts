import { PartialType } from '@nestjs/mapped-types';
import { CreateRoadmapStepDto } from './create-roadmap_step.dto';

export class UpdateRoadmapStepDto extends PartialType(CreateRoadmapStepDto) {}
