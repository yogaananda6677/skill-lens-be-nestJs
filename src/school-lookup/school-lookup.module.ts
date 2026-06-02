import { Module } from '@nestjs/common';
import { SchoolLookupController } from './school-lookup.controller';
import { SchoolLookupService } from './school-lookup.service';

@Module({
  controllers: [SchoolLookupController],
  providers: [SchoolLookupService],
})
export class SchoolLookupModule {}