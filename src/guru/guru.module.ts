import { Module } from '@nestjs/common';
import { GuruController } from './guru.controller';
import { GuruService } from './guru.service';
import { Guru } from './entities/guru.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';

@Module({
  controllers: [GuruController],
  providers: [GuruService],
  imports: [TypeOrmModule.forFeature([Guru, User])],
})
export class GuruModule {}
