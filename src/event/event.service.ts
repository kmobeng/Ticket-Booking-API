import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '../../generated/prisma/enums';
import { CreateTierDto } from './dto/create-tier.dto';
import { OutboxService } from '../outbox/outbox.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

type EventDashboard = {
  EventId: string;
  EventName: string;
  totalTickets: number;
  totalTicketsSold: number;
  totalTicketsRemaining: number;
  totalRevenue: number;
  remainingTicketsPerTier: {
    ticketId: string;
    ticketName: string;
    remainingTickets: number;
  }[];
};

@Injectable()
export class EventService {
  constructor(
    @InjectQueue('event') private eventQueue: Queue,
    private readonly prismaService: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  async createEvent(createEventDto: CreateEventDto, userId: string) {
    const organizer = await this.prismaService.organizer.findUnique({
      where: { userId },
    });

    const event = await this.prismaService.event.create({
      data: {
        ...createEventDto,
        organizerId: organizer!.id,
      },
    });

    return event;
  }

  async updateEvent(
    userId: string,
    eventId: string,
    updateEventDto: UpdateEventDto,
  ) {
    // Check if the event exists and belongs to the user
    const eventExist = await this.prismaService.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!eventExist) {
      throw new NotFoundException('Event not found');
    }

    if (eventExist.organizer.userId !== userId) {
      throw new NotFoundException(
        'You are not authorized to update this event',
      );
    }
    // Check if the event is closed or published
    if (eventExist.status === EventStatus.CLOSED) {
      throw new NotFoundException('Cannot update a closed event');
    }

    if (eventExist.status === EventStatus.PUBLISHED) {
      throw new NotFoundException('Cannot update a published event');
    }

    // Update the event
    const event = await this.prismaService.event.update({
      where: { id: eventId },
      data: {
        ...updateEventDto,
      },
    });

    if (updateEventDto.endDate) {
      await this.cancelScheduledClose(eventId);
    }

    return event;
  }

  async publishEvent(userId: string, eventId: string) {
    // Check if the event exists and belongs to the user
    const eventExist = await this.prismaService.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            userId: true,
          },
        },
        tickets: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!eventExist) {
      throw new NotFoundException('Event not found');
    }

    if (eventExist.organizer.userId !== userId) {
      throw new UnauthorizedException(
        'You are not authorized to publish this event',
      );
    }

    if (eventExist.tickets.length === 0) {
      throw new BadRequestException(
        'Cannot publish an event without tickets, Add at least one ticket to publish the event',
      );
    }

    // Check if the event is closed or published
    if (eventExist.status === EventStatus.CLOSED) {
      throw new NotFoundException('Cannot publish a closed event');
    }

    if (eventExist.status === EventStatus.PUBLISHED) {
      throw new NotFoundException('Event is already published');
    }

    // Publish the event
    const event = await this.prismaService.$transaction(async (tx) => {
      const event = await this.prismaService.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.PUBLISHED,
        },
      });

      const ttl =
        Math.floor(eventExist.endDate.getTime() / 1000) -
        Math.floor(new Date().getTime() / 1000); // Calculate TTL in seconds

      await this.outboxService.createEvent(tx, {
        aggregateType: 'Event',
        aggregateId: event.id,
        eventType: 'event-created',
        payload: {
          ttl,
          eventId: event.id,
        },
      });

      return event;
    });

    return event;
  }

  async unpublishEvent(userId: string, eventId: string) {
    // Check if the event exists and belongs to the user
    const eventExist = await this.prismaService.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!eventExist) {
      throw new NotFoundException('Event not found');
    }

    if (eventExist.organizer.userId !== userId) {
      throw new UnauthorizedException(
        'You are not authorized to unpublish this event',
      );
    }

    // Check if the event is closed or unpublished
    if (eventExist.status === EventStatus.CLOSED) {
      throw new NotFoundException('Cannot unpublish a closed event');
    }

    if (eventExist.status === EventStatus.DRAFT) {
      throw new NotFoundException('Event is already unpublished');
    }

    // Unpublish the event
    const event = await this.prismaService.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.DRAFT,
      },
    });

    await this.cancelScheduledClose(eventId);

    return event;
  }

  async getEvents() {
    const events = await this.prismaService.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
      },
    });

    if (!events || events.length === 0) {
      throw new NotFoundException('No events available');
    }

    return events;
  }

  async getEventbyId(eventId: string) {
    const event = await this.prismaService.event.findUnique({
      where: { id: eventId, status: EventStatus.PUBLISHED },
    });

    if (!event) {
      throw new NotFoundException('Event is not available');
    }

    return event;
  }

  //sales dashboard for an event, sold,revenue and remaining per tier
  async getEventDashboard(userId: string, eventId: string) {
    // Check if the event exists and belongs to the user
    const eventExist = await this.prismaService.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            userId: true,
          },
        },
        tickets: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            sold: true,
          },
        },
      },
    });

    if (!eventExist) {
      throw new NotFoundException('Event not found');
    }

    if (eventExist.organizer.userId !== userId) {
      throw new UnauthorizedException(
        'You are not authorized to view this event dashboard',
      );
    }

    const totalTickets = eventExist.tickets.reduce(
      (acc, ticket) => acc + ticket.quantity,
      0,
    );

    const totalTicketsSold = eventExist.tickets.reduce(
      (acc, ticket) => acc + ticket.sold,
      0,
    );

    const totalTicketsRemaining = totalTickets - totalTicketsSold;

    const totalRevenue = eventExist.tickets.reduce(
      (acc, ticket) => acc + ticket.sold * Number(ticket.price),
      0,
    );

    const remainingTicketsPerTier = eventExist.tickets.map((ticket) => ({
      ticketId: ticket.id,
      ticketName: ticket.name,
      remainingTickets: ticket.quantity - ticket.sold,
    }));

    const dashboard: EventDashboard = {
      EventId: eventExist.id,
      EventName: eventExist.title,
      totalTickets,
      totalTicketsSold,
      totalTicketsRemaining,
      totalRevenue,
      remainingTicketsPerTier,
    };

    return dashboard;
  }

  async createTicketTier(
    eventId: string,
    userId: string,
    createTierDto: CreateTierDto,
  ) {
    const eventExist = await this.prismaService.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!eventExist) throw new NotFoundException('Event is not availble');

    if (eventExist.organizer.userId !== userId)
      throw new UnauthorizedException(
        'You are not authorized to create tiers for this event',
      );

    if (eventExist.status === EventStatus.CLOSED)
      throw new BadRequestException('Cannot create tiers for a closed event');

    const ticketTier = await this.prismaService.ticket.create({
      data: {
        ...createTierDto,
        eventId: eventExist.id,
      },
    });
    return ticketTier;
  }

  async updateTicketTier(
    userId: string,
    tierId: string,
    updateTierDto: Partial<CreateTierDto>,
  ) {
    const tierExist = await this.prismaService.ticket.findUnique({
      where: { id: tierId },
      include: {
        event: {
          select: {
            organizer: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!tierExist) throw new NotFoundException('Tier not found');

    if (tierExist.event.organizer.userId !== userId)
      throw new UnauthorizedException(
        'You are not authorized to update this tier',
      );

    const updatedTier = await this.prismaService.ticket.update({
      where: { id: tierId },
      data: {
        ...updateTierDto,
      },
    });
    return updatedTier;
  }

  async getTicketTiers(eventId: string) {
    const eventExist = await this.prismaService.event.findUnique({
      where: { id: eventId },
      include: {
        tickets: true,
      },
    });

    if (!eventExist) throw new NotFoundException('Event is not availble');

    const tiersWithRemainingQuantity = eventExist.tickets.map((tier) => ({
      ...tier,
      remainingQuantity: tier.quantity - tier.sold,
    }));

    return tiersWithRemainingQuantity;
  }

  private async cancelScheduledClose(eventId: string) {
    const job = await this.eventQueue.getJob(`close-event-${eventId}`);
    if (job) await job.remove();
  }
}
