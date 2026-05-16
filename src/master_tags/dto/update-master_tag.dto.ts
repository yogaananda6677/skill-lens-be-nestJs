import { PartialType } from '@nestjs/mapped-types';
import { CreateMasterTagDto } from './create-master_tag.dto';

export class UpdateMasterTagDto extends PartialType(CreateMasterTagDto) {}
