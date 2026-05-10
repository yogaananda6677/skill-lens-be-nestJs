import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from 'typeorm';

@Entity()
export class Sekolah {

  @PrimaryGeneratedColumn()
  id_sekolah!: number;

  @Column()
  nama_sekolah!: string;

  @Column({ nullable: true })
  npsn!: string;

  @Column({ type: 'text', nullable: true })
  alamat!: string;

  @Column({ nullable: true })
  no_hp_sekolah!: string;

  @Column({
    type: 'enum',
    enum: ['panding', 'sukses'],
    nullable: true
  })
  status_verifikasi!: string;

  @Column({
    type: 'enum',
    enum: ['SMA', 'SMK'],
    nullable: true
  })
  jenis_sekolah!: string;
}