import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {

  @PrimaryGeneratedColumn()
  id_user!: number;

  @Column()
  nama!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  no_hp!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'guru', 'siswa']
  })
  role!: string;
}