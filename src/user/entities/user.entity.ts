import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {

  @PrimaryGeneratedColumn()
  id_user!: number;

  @Column()
  nama!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  no_hp!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'guru', 'siswa']
  })
  role!: string;

  @Column({ nullable: true })
  sekolahId!: number;
}