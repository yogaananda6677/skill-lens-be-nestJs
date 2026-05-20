import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GuruService } from './guru.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role';

@UseGuards(JwtAuthGuard, new RoleGuard(['guru']))
@Controller('guru')
export class GuruController {
  constructor(private readonly guruService: GuruService) {}

  @Get('workspace')
  getWorkspace(@Req() req: any) {
    return this.guruService.getWorkspace(req.user.id_user);
  }

  @Post('pilih-sekolah')
  chooseSchool(@Req() req: any, @Body() body: any) {
    return this.guruService.chooseSchool(req.user.id_user, body);
  }

  @Post('ajukan-sekolah')
  requestNewSchool(@Req() req: any, @Body() body: any) {
    return this.guruService.requestNewSchool(req.user.id_user, body);
  }

  @Get('jurusan')
  getJurusan(@Req() req: any) {
    return this.guruService.getJurusan(req.user.id_user);
  }

  @Post('jurusan')
  createJurusan(@Req() req: any, @Body() body: any) {
    return this.guruService.createJurusan(req.user.id_user, body);
  }

  @Put('jurusan/:id')
  updateJurusan(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.guruService.updateJurusan(req.user.id_user, Number(id), body);
  }

  @Delete('jurusan/:id')
  deleteJurusan(@Req() req: any, @Param('id') id: string) {
    return this.guruService.deleteJurusan(req.user.id_user, Number(id));
  }

  @Get('guidance-cases')
  getGuidanceCases(@Req() req: any) {
    return this.guruService.getGuidanceCases(req.user.id_user);
  }

  @Get('accounts')
  getSiswaAccounts(@Req() req: any) {
    return this.guruService.getSiswaAccounts(req.user.id_user);
  }

  @Get('siswa/:idSiswa/bimbingan')
  listGuidanceNotes(@Req() req: any, @Param('idSiswa') idSiswa: string) {
    return this.guruService.listGuidanceNotes(req.user.id_user, Number(idSiswa));
  }

  @Post('siswa/:idSiswa/bimbingan')
  createGuidanceNote(
    @Req() req: any,
    @Param('idSiswa') idSiswa: string,
    @Body() body: any,
  ) {
    return this.guruService.createGuidanceNote(req.user.id_user, Number(idSiswa), body);
  }
}
