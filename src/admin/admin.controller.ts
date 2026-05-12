import { Controller, Put, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(
        private adminService: AdminService,
    ) {}
    
    @Put('verifikasi/:id')
    verifikasi(
        @Param('id') id: number,
    ) {
        return this.adminService.verifikasiSekolah(Number(id));
    }
}