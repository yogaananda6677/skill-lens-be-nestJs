import { Module } from '@nestjs/common';
import { KurikulumMapelController } from './kurikulum_mapel.controller';
import { KurikulumMapelService } from './kurikulum_mapel.service';
import { KurikulumMapel } from './entities/kurikulum_mapel.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [KurikulumMapelController],
  providers: [KurikulumMapelService],
  imports: [TypeOrmModule.forFeature([KurikulumMapel])],
})
export class KurikulumMapelModule {}
