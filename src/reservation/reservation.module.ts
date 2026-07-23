import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ReservationProcessor } from './reservation.processor';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [AuthModule, OutboxModule],
  controllers: [ReservationController],
  providers: [ReservationService, PrismaService, ReservationProcessor],
})
export class ReservationModule {}
