import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateRoadmapMasterDto } from './dto/create-roadmap_master.dto';
import { UpdateRoadmapMasterDto } from './dto/update-roadmap_master.dto';
import { RoadmapMaster } from './entities/roadmap_master.entity';

@Injectable()
export class RoadmapMasterService {
  constructor(
    @InjectRepository(RoadmapMaster)
    private readonly roadmapRepo: Repository<RoadmapMaster>,
  ) {}

  create(dto: CreateRoadmapMasterDto) {
    const roadmap = this.roadmapRepo.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      category: dto.category?.trim() || null,
      target_type: dto.target_type ?? 'umum',
      recommended_for: dto.recommended_for?.trim() || null,
      is_active: dto.is_active === false ? 0 : 1,
    });

    return this.roadmapRepo.save(roadmap);
  }

  findAll() {
    return this.roadmapRepo.find({
      relations: ['steps', 'steps.details'],
      order: {
        id_roadmap: 'DESC',
        steps: { step_order: 'ASC', details: { detail_order: 'ASC' } },
      } as any,
    });
  }

  async findOne(id: number) {
    const roadmap = await this.roadmapRepo.findOne({
      where: { id_roadmap: id },
      relations: ['steps', 'steps.details'],
      order: {
        steps: { step_order: 'ASC', details: { detail_order: 'ASC' } },
      } as any,
    });

    if (!roadmap) {
      throw new NotFoundException('Roadmap tidak ditemukan.');
    }

    return roadmap;
  }

  async update(id: number, dto: UpdateRoadmapMasterDto) {
    const roadmap = await this.findOne(id);

    if (dto.title !== undefined) roadmap.title = dto.title.trim();
    if (dto.description !== undefined) roadmap.description = dto.description?.trim() || null;
    if (dto.category !== undefined) roadmap.category = dto.category?.trim() || null;
    if (dto.target_type !== undefined) roadmap.target_type = dto.target_type;
    if (dto.recommended_for !== undefined) roadmap.recommended_for = dto.recommended_for?.trim() || null;
    if (dto.is_active !== undefined) roadmap.is_active = dto.is_active ? 1 : 0;

    return this.roadmapRepo.save(roadmap);
  }

  async remove(id: number) {
    const roadmap = await this.findOne(id);
    roadmap.is_active = 0;
    await this.roadmapRepo.save(roadmap);
    return { message: 'Roadmap dinonaktifkan.' };
  }
}
