import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrganizerService {
  constructor(private readonly prismaService: PrismaService) {}

  async applyForOrganizer(userId: string, businessName: string) {
    const organizerExist = await this.prismaService.organizer.findUnique({
      where: { userId },
    });

    if (organizerExist && !organizerExist.verified) {
      throw new ConflictException('User has already applied for organizer');
    }

    if (organizerExist && organizerExist.verified) {
      throw new ConflictException('User is already a verified organizer');
    }

    const organizer = await this.prismaService.organizer.create({
      data: {
        userId,
        businessName,
      },
    });

    return organizer;
  }

  async getOrganizerData(userId: string) {
    const organizer = await this.prismaService.organizer.findUnique({
      where: { userId },
      include: {
        events: true,
      },
    });

    return organizer;
  }
}
