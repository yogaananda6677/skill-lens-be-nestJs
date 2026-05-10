import { Module } from '@nestjs/common';
import { SemesterController } from './semester.controller';
import { SemesterService } from './semester.service';
import { Semester } from './entities/semester.entity';
import { TypeOrmModule } from '@nestjs/typeorm';


@Module({
  controllers: [SemesterController],
  providers: [SemesterService],
  imports: [TypeOrmModule.forFeature([Semester])],
})
export class SemesterModule {}
