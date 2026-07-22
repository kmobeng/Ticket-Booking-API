import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { NotificationModule } from '../notification/notification.module';
import { OutboxPoller } from './outbox-poller';
import { PrismaService } from '../prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { EventProcessor } from './event.provider';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'event',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: false,
      },
    }),
    NotificationModule,
  ],
  providers: [OutboxService, OutboxPoller, PrismaService, EventProcessor],
  exports: [OutboxService],
})
export class OutboxModule {}
