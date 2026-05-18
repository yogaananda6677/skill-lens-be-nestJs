import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MasterTag, MasterTagTipe } from './entities/master_tag.entity';

type GroupedTags = Record<MasterTagTipe, Array<{
  id: number;
  tipe: MasterTagTipe;
  label: string;
  mapped_key: string;
  kategori_hint: string | null;
  sort_order: number;
}>>;

@Injectable()
export class MasterTagsService {
  constructor(
    @InjectRepository(MasterTag)
    private readonly masterTagRepo: Repository<MasterTag>,
  ) {}

  async findAll(tipe?: string) {
    const where: any = { is_active: 1 };
    if (tipe) where.tipe = tipe.toLowerCase();

    const rows = await this.masterTagRepo.find({
      where,
      order: { tipe: 'ASC', sort_order: 'ASC', id: 'ASC' },
    });

    const mapRow = (row: MasterTag) => ({
      id: row.id,
      tipe: row.tipe,
      label: row.label,
      mapped_key: row.mapped_key,
      kategori_hint: row.kategori_hint,
      sort_order: row.sort_order,
    });

    if (tipe) return rows.map(mapRow);

    const grouped: GroupedTags = {
      minat: [],
      bakat: [],
      hobi: [],
      pengalaman: [],
    };

    for (const row of rows) {
      if (row.tipe in grouped) grouped[row.tipe].push(mapRow(row));
    }

    return grouped;
  }
}
