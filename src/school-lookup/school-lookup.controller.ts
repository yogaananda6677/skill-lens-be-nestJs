import { Controller, Get, Query } from '@nestjs/common';
import { SchoolLookupService } from './school-lookup.service';

@Controller('school-lookup')
export class SchoolLookupController {
  constructor(private readonly schoolLookupService: SchoolLookupService) {}

  @Get()
  findByNpsn(@Query('npsn') npsn: string) {
    return this.schoolLookupService.findByNpsn(npsn);
  }
}