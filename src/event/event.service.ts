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
  constructor(private readonly prismaService: PrismaService) {}

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
    const event = await this.prismaService.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.PUBLISHED,
      },
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
}
