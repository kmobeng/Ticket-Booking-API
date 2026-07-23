import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { ReservationStatus } from '../../generated/prisma/enums';

@Processor('reservation')
export class ReservationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReservationProcessor.name);
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'expire-reservation': {
        this.logger.debug(
          `Processing job: ${job.name} for reservationId: ${job.data.reservationId}`,
        );
        const { reservationId, ticketId } = job.data;
        await this.prismaService.reservation.updateMany({
          where: { id: reservationId, status: ReservationStatus.HELD },
          data: { status: ReservationStatus.EXPIRED },
        });

        await this.prismaService.ticket.updateMany({
          where: { id: ticketId },
          data: { reserved: { decrement: 1 } },
        });

        break;
      }
      default:
        this.logger.warn(`Unhandled reservation job type: ${job.name}`);
    }
  }
}
