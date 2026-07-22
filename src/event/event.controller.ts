import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { UpdateEventDto } from './dto/update-event.dto';

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
  @Post('create')
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: AccessJWTPayload,
  ) {
    if (createEventDto.startDate >= createEventDto.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const event = await this.eventService.createEvent(createEventDto, user.sub);

    return {
      success: true,
      message: 'Event created successfully',
      event,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ORGANIZER)
  @Post('update/:eventId')
  async updateEvent(
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: AccessJWTPayload,
    @Param('eventId') eventId: string,
  ) {
    if (updateEventDto.startDate && updateEventDto.endDate) {
      if (updateEventDto.startDate >= updateEventDto.endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }
    const userId = user.sub;
    const event = await this.eventService.updateEvent(
      userId,
      eventId,
      updateEventDto,
    );

    return {
      success: true,
      message: 'Event updated successfully',
      data: event,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ORGANIZER)
  @Patch('/:eventId/publish')
  async publishEvent(
    @CurrentUser() user: AccessJWTPayload,
    @Param('eventId') eventId: string,
  ) {
    const userId = user.sub;
    const event = await this.eventService.publishEvent(userId, eventId);

    return {
      success: true,
      message: 'Event published successfully',
      data: event,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ORGANIZER)
  @Patch('/:eventId/unpublish')
  async unpublishEvent(
    @CurrentUser() user: AccessJWTPayload,
    @Param('eventId') eventId: string,
  ) {
    const userId = user.sub;
    const event = await this.eventService.unpublishEvent(userId, eventId);

    return {
      success: true,
      message: 'Event unpublished successfully',
      data: event,
    };
  }

  //public route to get all events for a user
  @Get('/')
  async getEvents() {
    const events = await this.eventService.getEvents();

    return {
      success: true,
      message: 'Events retrieved successfully',
      data: events,
    };
  }

  @Get('/:eventId')
  async getEvent(@Param('eventId') eventId: string) {
    const event = await this.eventService.getEventbyId(eventId);

    return {
      success: true,
      message: 'Event retrieved successfully',
      data: event,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ORGANIZER)
  @Get('events/:eventId/dashboard')
  async getEventDashboard(
    @CurrentUser() user: AccessJWTPayload,
    @Param('eventId') eventId: string,
  ) {
    const userId = user.sub;
    const dashboard = await this.eventService.getEventDashboard(
      userId,
      eventId,
    );

    return {
      success: true,
      message: 'Event dashboard retrieved successfully',
      data: dashboard,
    };
  }
}
