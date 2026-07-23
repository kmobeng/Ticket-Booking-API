import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

type OutboxEvent = {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt: Date;
  processedAt: Date | null;
};

@Injectable()
export class OutboxPoller {
  private readonly logger = new Logger(OutboxPoller.name);

  constructor(
    @InjectQueue('event') private eventQueue: Queue,
    @InjectQueue('reservation') private reservationQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async dispatchOutboxEvents() {
    const events = (await this.prisma.outboxEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })) as OutboxEvent[];

    if (events.length === 0) return;

    for (const event of events) {
      try {
        await this.handleEvent(event);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() },
        });
      } catch (err) {
        this.logger.error(`Failed to dispatch outbox event ${event.id}`, err);
      }
    }
  }

  private async handleEvent(event: OutboxEvent) {
    switch (event.eventType) {
      case 'user-registered':
        await this.notificationService.enqueueEmailVerification({
          to: event.payload.email,
          token: event.payload.verificationToken,
        });
        break;
      case 'password-reset-requested':
        await this.notificationService.enqueuePasswordReset({
          to: event.payload.email,
          token: event.payload.resetToken,
        });
        break;
      case 'email-verification-requested':
        await this.notificationService.enqueueEmailVerification({
          to: event.payload.email,
          token: event.payload.token,
        });
        break;
      case 'email-update-requested':
        await this.notificationService.enqueueEmailUpdate({
          to: event.payload.email,
          token: event.payload.token,
        });
        break;
      case 'password-changed':
        await this.notificationService.enqueuePasswordChange({
          email: event.payload.email,
        });
        break;
      case 'password-set':
        await this.notificationService.enqueueEmailSetPassword({
          email: event.payload.email,
        });
        break;
      case 'organizer-verified':
        await this.notificationService.enqueueOrganizerVerified({
          email: event.payload.email,
          name: event.payload.name,
        });
        break;
      case 'organizer-unverified':
        await this.notificationService.enqueueOrganizerUnverified({
          email: event.payload.email,
          name: event.payload.name,
        });
        break;
      case 'event-created':
        await this.eventQueue.add(
          'close-event',
          { eventId: event.payload.eventId },
          {
            delay: Math.max(event.payload.ttl * 1000 + 5000, 0), // Add a 5-second
            jobId: `close-event-${event.payload.eventId}`, // Unique job ID to prevent duplicates
          },
        );
        break;
      case 'reservation-created':
        await this.reservationQueue.add(
          'expire-reservation',
          {
            reservationId: event.payload.reservationId,
            ticketId: event.payload.ticketId,
          },
          {
            delay: Math.max(event.payload.delay + 5000, 0), // Add a 5-second buffer
            jobId: `expire-reservation-${event.payload.reservationId}`,
          },
        );
        break;
      default:
        this.logger.warn(`Unhandled outbox event type: ${event.eventType}`);
    }
  }
}
