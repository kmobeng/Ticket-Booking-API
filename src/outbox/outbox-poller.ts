import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma.service';

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
    this.logger.debug(`Found ${events.length} unprocessed outbox events`);

    if (events.length === 0) return;

    for (const event of events) {
      try {
        this.logger.debug(
          `Dispatching outbox event ${event.id} of type ${event.eventType}`,
        );
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
      case 'user_registered':
        await this.notificationService.enqueueEmailVerification({
          to: event.payload.email,
          token: event.payload.verificationToken,
        });
        break;
    }
  }
}
