import { PartialType } from '@nestjs/mapped-types';
import { CreatePrestasiSiswaDto } from './create-prestasi_siswa.dto';

export class UpdatePrestasiSiswaDto extends PartialType(CreatePrestasiSiswaDto) {}
