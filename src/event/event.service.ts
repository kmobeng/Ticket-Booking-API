import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

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
}
