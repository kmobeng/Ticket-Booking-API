import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { IsEmailVerifiedGuard } from '../common/guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from '../common/guards/need-to-change-password.guard';
import { ApplyDto } from './dto/apply.dto';
import { CurrentUser } from '../common/decorators/currentUser.decorator';
import type { AccessJWTPayload } from '../common/interfaces/jwt.interface';
import { Roles } from '../common/decorators/role.decorator';

@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Post('apply')
  async apply(
    @Body() applyDto: ApplyDto,
    @CurrentUser() user: AccessJWTPayload,
  ) {
    const userId = user.sub;
    const { businessName } = applyDto;

    const organizer = await this.organizerService.applyForOrganizer(
      userId,
      businessName,
    );

    return {
      success: true,
      message: 'Organizer application submitted successfully',
      data: { organizer },
    };
  }

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Roles('ORGANIZER')
  @Post('dashboard')
  async dashboard(@CurrentUser() user: AccessJWTPayload) {
    const userId = user.sub;

    const organizerData = await this.organizerService.getOrganizerData(userId);

    return {
      success: true,
      data: { organizerData },
    };
  }
}
