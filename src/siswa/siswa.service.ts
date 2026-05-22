import { Injectable } from '@nestjs/common';

import { UserRole } from '../user/entities/user.entity';
import { SiswaImportService } from './services/siswa-import.service';
import { SiswaProfileService } from './services/siswa-profile.service';
import { SiswaSpkService } from './services/siswa-spk.service';

/**
 * Facade service untuk menjaga backward compatibility controller lama.
 * Logika utama sengaja dipisah ke service kecil agar SiswaService tidak gemuk.
 */
@Injectable()
export class SiswaService {
  constructor(
    private readonly siswaProfileService: SiswaProfileService,
    private readonly siswaSpkService: SiswaSpkService,
    private readonly siswaImportService: SiswaImportService,
  ) {}

  getMe(userId: number) {
    return this.siswaProfileService.getMe(userId);
  }

  updateProfil(userId: number, body: any) {
    return this.siswaProfileService.updateProfil(userId, body);
  }

  prosesSpk(userId: number, body: any) {
    return this.siswaSpkService.prosesSpk(userId, body);
  }

  importExcel(file: any, actor: { id_user: number; role: UserRole }, body: any) {
    return this.siswaImportService.importExcel(file, actor, body);
  }

  getLatestSpk(userId: number) {
  return this.siswaSpkService.getLatestSpk(userId);
}


}
