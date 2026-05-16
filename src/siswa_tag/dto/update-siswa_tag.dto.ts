import { PartialType } from '@nestjs/mapped-types';
import { CreateSiswaTagDto } from './create-siswa_tag.dto';

export class UpdateSiswaTagDto extends PartialType(CreateSiswaTagDto) {}
