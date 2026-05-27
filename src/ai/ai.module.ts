import { Module } from '@nestjs/common';
import { AiReasonPolisherService } from './ai-reason-polisher.service';

@Module({
  providers: [AiReasonPolisherService],
  exports: [AiReasonPolisherService],
})
export class AiModule {}