import { Controller, Get, Patch, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { currentUser } from '../common/decorators/currentUser.decorator';
import type { AccessJWTPayload } from '../common/interfaces/jwt.interface';
import { UsersService } from './users.service';
import { IsEmailVerifiedGuard } from '../common/guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from '../common/guards/need-to-change-password.guard';
import { UpdateMeDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@currentUser() user: AccessJWTPayload) {
    const userId = user.sub;

    const userProfile = await this.usersService.findById(userId);

    return {
      success: true,
      data: userProfile,
    };
  }

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Patch('profile')
  async updateProfile(
    @currentUser() user: AccessJWTPayload,
    @Body() updateMeDto: UpdateMeDto,
  ) {
    const userId = user.sub;
    const { name } = updateMeDto;

    const updatedProfile = await this.usersService.updateProfile(userId, name);

    return {
      success: true,
      data: updatedProfile,
    };
  }
}
