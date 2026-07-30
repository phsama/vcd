import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_GENERATION } from './queues';
import { GenerationService } from './generation.service';

@Processor(QUEUE_GENERATION)
export class GenerationProcessor extends WorkerHost {
  constructor(private readonly generation: GenerationService) {
    super();
  }

  async process(job: Job) {
    return this.generation.ensureSlotsAndGenerate(job.data?.daysAhead ?? 3);
  }
}
