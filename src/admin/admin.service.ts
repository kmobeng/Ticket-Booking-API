import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { emit } from 'process';

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  async getAllUsers() {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        needToChangePassword: true,
        pendingEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  async getUserById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        needToChangePassword: true,
        pendingEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getAllOrganizers(
    search: string,
    page: number,
    limit: number,
    verified: string,
  ) {
    const organizers = await this.prismaService.organizer.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            pendingEmail: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      where: {
        OR: [
          { businessName: { contains: search } },
          { user: { email: { contains: search } } },
        ],
        verified:
          verified === 'true' ? true : verified === 'false' ? false : undefined,
      },
      orderBy: { businessName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (organizers.length === 0) {
      throw new NotFoundException('No organizers found');
    }

    return organizers;
  }

  async verifyOrganizer(organizerId: string) {
    const organizerExist = await this.prismaService.organizer.findUnique({
      where: { id: organizerId },
    });

    if (!organizerExist) {
      throw new NotFoundException('Organizer not found');
    }

    if (organizerExist.verified) {
      throw new BadRequestException('Organizer is already verified');
    }

    await this.prismaService.$transaction(async (tx) => {
      const organizerUpdate = await tx.organizer.update({
        where: { id: organizerId },
        data: { verified: true },
      });

      const userUpdate = await tx.user.update({
        where: { id: organizerExist.userId },
        data: { role: 'ORGANIZER' },
        select: {
          email: true,
          name: true,
        },
      });

      await this.outboxService.createEvent(tx, {
        aggregateType: 'organizer',
        aggregateId: organizerExist.id,
        eventType: 'organizer-verified',
        payload: {
          email: userUpdate.email,
          name: userUpdate.name,
        },
      });

      return organizerUpdate;
    });
  }

  async unverifyOrganizer(organizerId: string) {
    const organizerExist = await this.prismaService.organizer.findUnique({
      where: { id: organizerId },
    });

    if (!organizerExist) {
      throw new NotFoundException('Organizer not found');
    }

    if (!organizerExist.verified) {
      throw new BadRequestException('Organizer is already unverified');
    }

    await this.prismaService.$transaction(async (tx) => {
      const organizerUpdate = await tx.organizer.update({
        where: { id: organizerId },
        data: { verified: false },
      });

      const userUpdate = await tx.user.update({
        where: { id: organizerExist.userId },
        data: { role: 'USER' },
        select: {
          email: true,
          name: true,
        },
      });

      await this.outboxService.createEvent(tx, {
        aggregateType: 'organizer',
        aggregateId: organizerExist.id,
        eventType: 'organizer-unverified',
        payload: {
          email: userUpdate.email,
          name: userUpdate.name,
        },
      });

      return organizerUpdate;
    });
  }

  async listAllEvents() {
    return this.prismaService.event.findMany();
  }

  async listAllEventsByOrganizer(organizerId: string) {
    const organizerExist = await this.prismaService.organizer.findUnique({
      where: { id: organizerId },
    });

    if (!organizerExist) {
      throw new NotFoundException('Organizer not found');
    }

    return this.prismaService.event.findMany({
      where: { organizerId },
    });
  }

  async listAllOrders() {
    return this.prismaService.order.findMany();
  }
}
