import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Siswa } from './entities/siswa.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SiswaService {
    constructor(
        @InjectRepository(User)
            private userRepo: Repository<User>,

        @InjectRepository(Siswa)
            private siswaRepo: Repository<Siswa>,

    )   {}

    async importExcel(file: any) {
        const dataexcel = XLSX.read(file.buffer, {
        type: 'buffer',
        });
    const namasheet = dataexcel.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(
      dataexcel.Sheets[namasheet],
    );

    for (const siswa of data as any[]) {
    const username = siswa.nama.toLowerCase().replace(/\s/g, '') + siswa.nisn.slice(-3);
    const password = await bcrypt.hash( siswa.nisn, 15, );
    const userBaru = await this.userRepo.save({
        nama: siswa.nama,
        username,
        password,
        role: 'siswa',
    });

    await this.siswaRepo.save({
        nisn: siswa.nisn,
        kelas: siswa.kelas,
        jurusan: siswa.jurusan,
        user: userBaru,
    });

    }
    return {
        message: 'Import siswa berhasil',
    };
  }

}