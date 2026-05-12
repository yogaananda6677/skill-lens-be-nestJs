import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sekolah } from '../sekolah/entities/sekolah.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Sekolah)
        private sekolahRepo: Repository<Sekolah>,
    ) {}
    async verifikasiSekolah(id: number) {
        await this.sekolahRepo.update(id, {
            status_verifikasi: 'approved',
        });
        return {
            message: 'Sekolah berhasil diverifikasi',
        };
    }
}