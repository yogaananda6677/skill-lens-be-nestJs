import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoadmapMaster } from '../roadmap_master/entities/roadmap_master.entity';
import { CreateRoadmapStepDto } from './dto/create-roadmap_step.dto';
import { UpdateRoadmapStepDto } from './dto/update-roadmap_step.dto';
import { RoadmapStep } from './entities/roadmap_step.entity';

@Injectable()
export class RoadmapStepService {
  constructor(
    @InjectRepository(RoadmapStep)
    private readonly stepRepo: Repository<RoadmapStep>,
    @InjectRepository(RoadmapMaster)
    private readonly roadmapRepo: Repository<RoadmapMaster>,
  ) {}

  async create(dto: CreateRoadmapStepDto) {
    const roadmap = await this.roadmapRepo.findOne({ where: { id_roadmap: dto.id_roadmap } });
    if (!roadmap) throw new NotFoundException('Roadmap master tidak ditemukan.');

    const step = this.stepRepo.create({
      id_roadmap: roadmap.id_roadmap,
      roadmap,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      step_order: dto.step_order ?? 1,
      estimated_duration: dto.estimated_duration?.trim() || null,
      output_target: dto.output_target?.trim() || null,
      is_active: 1,
    });
    return this.stepRepo.save(step);
  }

  findAll() {
    return this.stepRepo.find({ relations: ['roadmap', 'details'], order: { id_roadmap: 'ASC', step_order: 'ASC' } });
  }

  async findOne(id: number) {
    const step = await this.stepRepo.findOne({
      where: { id_roadmap_step: id },
      relations: ['roadmap', 'details'],
      order: { details: { detail_order: 'ASC' } } as any,
    });
    if (!step) throw new NotFoundException('Step roadmap tidak ditemukan.');
    return step;
  }

  async update(id: number, dto: UpdateRoadmapStepDto) {
    const step = await this.findOne(id);
    if (dto.title !== undefined) step.title = dto.title.trim();
    if (dto.description !== undefined) step.description = dto.description?.trim() || null;
    if (dto.step_order !== undefined) step.step_order = dto.step_order;
    if (dto.estimated_duration !== undefined) step.estimated_duration = dto.estimated_duration?.trim() || null;
    if (dto.output_target !== undefined) step.output_target = dto.output_target?.trim() || null;
    return this.stepRepo.save(step);
  }

  async remove(id: number) {
    const step = await this.findOne(id);
    step.is_active = 0;
    await this.stepRepo.save(step);
    return { message: 'Step roadmap dinonaktifkan.' };
  }
}
