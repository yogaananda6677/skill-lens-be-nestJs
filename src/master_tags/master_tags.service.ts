import { Injectable } from '@nestjs/common';
import { CreateMasterTagDto } from './dto/create-master_tag.dto';
import { UpdateMasterTagDto } from './dto/update-master_tag.dto';

@Injectable()
export class MasterTagsService {
  create(createMasterTagDto: CreateMasterTagDto) {
    return 'This action adds a new masterTag';
  }

  findAll() {
    return `This action returns all masterTags`;
  }

  findOne(id: number) {
    return `This action returns a #${id} masterTag`;
  }

  update(id: number, updateMasterTagDto: UpdateMasterTagDto) {
    return `This action updates a #${id} masterTag`;
  }

  remove(id: number) {
    return `This action removes a #${id} masterTag`;
  }
}
