import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guru } from './entities/guru.entity';

@Injectable()
export class GuruService {}
