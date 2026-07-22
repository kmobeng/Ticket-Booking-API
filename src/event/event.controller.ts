import { Body, Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { Role } from '../../generated/prisma/enums';
import { RoleGuard } from '../common/guards/role.guard';
import { IsEmailVerifiedGuard } from '../common/guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from '../common/guards/need-to-change-password.guard';
import { EventService } from './event.service';
import { Roles } from '../common/decorators/role.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { CurrentUser } from '../common/decorators/currentUser.decorator';
import type { AccessJWTPayload } from '../common/interfaces/jwt.interface';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ORGANIZER)
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: AccessJWTPayload,
  ) {
    const event = await this.eventService.createEvent(createEventDto, user.sub);

    return {
      success: true,
      message: 'Event created successfully',
      event,
    };
  }
}
