import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { IsEmailVerifiedGuard } from '../common/guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from '../common/guards/need-to-change-password.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CurrentUser } from '../common/decorators/currentUser.decorator';
import type { AccessJWTPayload } from '../common/interfaces/jwt.interface';
import { ReservationService } from './reservation.service';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Post('create')
  async createReservation(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() createReservation: CreateReservationDto,
    @CurrentUser() user: AccessJWTPayload,
  ) {
    const userId = user.sub;
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const reservation = await this.reservationService.createReservation(
      idempotencyKey,
      createReservation,
      userId,
    );

    return {
      success: true,
      message: 'Reservation created successfully.',
      data: reservation,
    };
  }

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Post('release/:reservationId')
  async releaseReservation(
    @CurrentUser() user: AccessJWTPayload,
    @Param('reservationId') reservationId: string,
  ) {
    const userId = user.sub;

    const reservation = await this.reservationService.releaseReservation(
      reservationId,
      userId,
    );

    return {
      success: true,
      message: 'Reservation released successfully.',
      data: reservation,
    };
  }
}
