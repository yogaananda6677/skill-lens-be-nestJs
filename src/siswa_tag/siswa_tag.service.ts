import { Injectable } from '@nestjs/common';
import { CreateSiswaTagDto } from './dto/create-siswa_tag.dto';
import { UpdateSiswaTagDto } from './dto/update-siswa_tag.dto';

@Injectable()
export class SiswaTagService {
  create(createSiswaTagDto: CreateSiswaTagDto) {
    return 'This action adds a new siswaTag';
  }

  findAll() {
    return `This action returns all siswaTag`;
  }

  findOne(id: number) {
    return `This action returns a #${id} siswaTag`;
  }

  update(id: number, updateSiswaTagDto: UpdateSiswaTagDto) {
    return `This action updates a #${id} siswaTag`;
  }

  remove(id: number) {
    return `This action removes a #${id} siswaTag`;
  }
}
