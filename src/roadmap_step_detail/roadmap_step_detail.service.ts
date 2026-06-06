import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoadmapStep } from '../roadmap_step/entities/roadmap_step.entity';
import { CreateRoadmapStepDetailDto } from './dto/create-roadmap_step_detail.dto';
import { UpdateRoadmapStepDetailDto } from './dto/update-roadmap_step_detail.dto';
import { RoadmapStepDetail } from './entities/roadmap_step_detail.entity';

@Injectable()
export class RoadmapStepDetailService {
  constructor(
    @InjectRepository(RoadmapStepDetail)
    private readonly detailRepo: Repository<RoadmapStepDetail>,
    @InjectRepository(RoadmapStep)
    private readonly stepRepo: Repository<RoadmapStep>,
  ) {}

  async create(dto: CreateRoadmapStepDetailDto) {
    const step = await this.stepRepo.findOne({ where: { id_roadmap_step: dto.id_roadmap_step } });
    if (!step) throw new NotFoundException('Step roadmap tidak ditemukan.');

    const detail = this.detailRepo.create({
      id_roadmap_step: step.id_roadmap_step,
      step,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      reference_link: dto.reference_link?.trim() || null,
      reference_type: dto.reference_type?.trim() || null,
      detail_order: dto.detail_order ?? 1,
      is_active: dto.is_active === false ? 0 : 1,
    });
    return this.detailRepo.save(detail);
  }

  findAll() {
    return this.detailRepo.find({
      where: { is_active: 1 },
      relations: ['step', 'step.roadmap'],
      order: { id_roadmap_step: 'ASC', detail_order: 'ASC' },
    });
  }

  async findOne(id: number) {
    const detail = await this.detailRepo.findOne({
      where: { id_roadmap_step_detail: id },
      relations: ['step', 'step.roadmap'],
    });
    if (!detail) throw new NotFoundException('Detail roadmap tidak ditemukan.');
    return detail;
  }

  async update(id: number, dto: UpdateRoadmapStepDetailDto) {
    const detail = await this.findOne(id);
    if (dto.title !== undefined) detail.title = dto.title.trim();
    if (dto.description !== undefined) detail.description = dto.description?.trim() || null;
    if (dto.reference_link !== undefined) detail.reference_link = dto.reference_link?.trim() || null;
    if (dto.reference_type !== undefined) detail.reference_type = dto.reference_type?.trim() || null;
    if (dto.detail_order !== undefined) detail.detail_order = dto.detail_order;
    if (dto.is_active !== undefined) detail.is_active = dto.is_active ? 1 : 0;
    return this.detailRepo.save(detail);
  }

  async remove(id: number) {
    const detail = await this.findOne(id);
    detail.is_active = 0;
    await this.detailRepo.save(detail);
    return { message: 'Detail roadmap dinonaktifkan.' };
  }
}
