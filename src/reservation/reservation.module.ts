import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ReservationProcessor } from './reservation.processor';
import { OutboxModule } from '../outbox/outbox.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reservation',
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
  controllers: [ReservationController],
  providers: [ReservationService, PrismaService, ReservationProcessor],
})
export class ReservationModule {}
