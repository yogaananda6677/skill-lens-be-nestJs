
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';


@Entity('master_tag')
export class MasterTag {
  @PrimaryGeneratedColumn()
  id_master_tag!: number;

  @Column({ type: 'varchar', length: 120 })
  nama_tag!: string;

  @Column({ type: 'varchar', length: 120 })
  kategori_tag!: string;

  @Column({ type: 'varchar', length: 120 })
  tipe_tag!: string;
}
