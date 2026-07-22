import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { OutboxModule } from '../outbox/outbox.module';
import { BullModule } from '@nestjs/bullmq';

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
    AuthModule,
    OutboxModule,
  ],
  providers: [EventService, PrismaService],
  controllers: [EventController],
})
export class EventModule {}
