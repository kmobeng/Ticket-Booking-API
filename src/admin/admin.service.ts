import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAllUsers() {
    return this.prismaService.user.findMany();
  }

  async getUserById(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  async getAllOrganizers(search: string, page: number, limit: number) {
    return this.prismaService.organizer.findMany({
      include: { user: true },
      where: {
        OR: [
          { businessName: { contains: search } },
          { user: { email: { contains: search } } },
        ],
      },
      skip: (page - 1) * limit,
      take: limit,
    });
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

    return this.prismaService.organizer.update({
      where: { id: organizerId },
      data: { verified: true },
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

    return this.prismaService.organizer.update({
      where: { id: organizerId },
      data: { verified: false },
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
