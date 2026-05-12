import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  create(data: Partial<User>) {
    return this.userRepo.save(data);
  }

  findByUsername(username: string) {
    return this.userRepo.findOne({ where: { username } });
  }

  findAll() {
    return this.userRepo.find();
  }

  update(id: number, data: Partial<User>) {
    return this.userRepo.update(id, data);
  }

  remove(id: number) {
    return this.userRepo.delete(id);
  }
}