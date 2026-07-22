import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '../prisma.service';
import { Job } from 'bullmq';

@Processor('event')
export class EventProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'event-created') {
      const { eventId } = job.data;
      await this.prisma.event.updateMany({
        where: { id: eventId, status: 'PUBLISHED' },
        data: { status: 'CLOSED' },
      });
    }
  }
}
