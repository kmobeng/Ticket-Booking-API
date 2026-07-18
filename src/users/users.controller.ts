import { Controller, Get, Patch, UseGuards, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { currentUser } from '../common/decorators/currentUser.decorator';
import type { AccessJWTPayload } from '../common/interfaces/jwt.interface';
import { UsersService } from './users.service';
import { IsEmailVerifiedGuard } from '../common/guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from '../common/guards/need-to-change-password.guard';
import { UpdateMeDto } from './dto/update-user.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { TokenUtils } from '../auth/utils/auth.util';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenUtils: TokenUtils,
  ) {}

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

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Patch('email')
  async updateEmail(
    @currentUser() user: AccessJWTPayload,
    @Body() updateEmailDto: UpdateEmailDto,
  ) {
    const userId = user.sub;
    const { email, password } = updateEmailDto;

    await this.usersService.updateEmail(email, password, userId);

    return {
      success: true,
      message:
        'Email update requested. Please check your email for verification.',
    };
  }

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Patch('verify-email-update/:token')
  async verifyEmailUpdate(
    @currentUser() user: AccessJWTPayload,
    @Param('token') token: string,
  ) {
    const { sub, exp, jti } = user;

    const updatedEmail = await this.usersService.verifyEmailUpdateToken(
      sub,
      token,
      exp! - Math.floor(Date.now() / 1000),
      jti!,
    );

    const payload: AccessJWTPayload = {
      sub: user.sub,
      email: updatedEmail,
      role: user.role,
      isEmailVerified: true,
      needToChangePassword: user.needToChangePassword,
    };

    const newToken = this.tokenUtils.generateAccessToken(payload);

    return {
      success: true,
      message: 'Email updated successfully.',
      token: newToken,
    };
  }
}
