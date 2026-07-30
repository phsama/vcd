import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_GENERATION, QUEUE_TTS } from './queues';

const queues = BullModule.registerQueue({ name: QUEUE_GENERATION }, { name: QUEUE_TTS });

@Module({
  imports: [queues],
  exports: [queues],
})
export class QueuesModule {}
