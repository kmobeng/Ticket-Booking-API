import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class OutboxService {
  async createEvent(
    tx: Prisma.TransactionClient,
    params: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Record<string, any>;
    },
  ) {
    return tx.outboxEvent.create({ data: params });
  }
}
