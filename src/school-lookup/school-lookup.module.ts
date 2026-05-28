import { Module } from '@nestjs/common';
import { SchoolLookupController } from './school-lookup.controller';
import { SchoolLookupService } from './school-lookup.service';

@Module({
  controllers: [SchoolLookupController],
  providers: [SchoolLookupService],
  exports: [SchoolLookupService],
})
export class SchoolLookupModule {}