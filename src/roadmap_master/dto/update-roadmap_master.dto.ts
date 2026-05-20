import { PartialType } from '@nestjs/mapped-types';
import { CreateRoadmapMasterDto } from './create-roadmap_master.dto';

export class UpdateRoadmapMasterDto extends PartialType(CreateRoadmapMasterDto) {}
