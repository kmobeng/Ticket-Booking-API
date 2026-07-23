import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PrismaService } from '../prisma.service';
import { EventStatus, ReservationStatus } from '../../generated/prisma/enums';
import { OutboxService } from '../outbox/outbox.service';

type TicketWithEventStatus = {
  id: string;
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  reserved: number;
  sold: number;
  status: EventStatus;
};

@Injectable()
export class ReservationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  async createReservation(
    idempotencyKey: string,
    createReservationDto: CreateReservationDto,
    userId: string,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const existing = await tx.reservation.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;

      const [ticket] = await tx.$queryRaw<TicketWithEventStatus[]>`
        SELECT "Ticket".*, "Event"."status" FROM "Ticket"
        INNER JOIN "Event" ON "Ticket"."eventId" = "Event"."id"
        WHERE "Ticket"."id" = ${createReservationDto.ticketId} FOR UPDATE
    `;

      if (!ticket) throw new NotFoundException('Ticket not found');

      if (ticket.status !== EventStatus.PUBLISHED) {
        throw new BadRequestException('Event is not published yet.');
      }

      const remaining = ticket.quantity - ticket.reserved - ticket.sold;
      if (remaining < createReservationDto.quantity) {
        if (remaining <= 0) {
          throw new BadRequestException(
            `Not enough tickets available. No tickets left.`,
          );
        }
        throw new BadRequestException(
          `Not enough tickets available. Only ${remaining} left.`,
        );
      }

      await tx.ticket.update({
        where: { id: createReservationDto.ticketId },
        data: { reserved: { increment: createReservationDto.quantity } },
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const reservation = await tx.reservation.create({
        data: {
          ticketId: createReservationDto.ticketId,
          userId,
          quantity: createReservationDto.quantity,
          status: ReservationStatus.HELD,
          expiresAt,
          idempotencyKey,
        },
      });

      await this.outboxService.createEvent(tx, {
        aggregateType: 'reservation',
        aggregateId: reservation.id,
        eventType: 'reservation-created',
        payload: {
          reservationId: reservation.id,
          ticketId: reservation.ticketId,
          delay: 10 * 1000,
        },
      });

      return reservation;
    });
  }
}
