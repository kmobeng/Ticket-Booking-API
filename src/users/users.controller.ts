import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/currentUser.decorator';
import type { AccessJWTPayload } from '../common/interfaces/jwt.interface';
import { UsersService } from './users.service';
import { IsEmailVerifiedGuard } from '../common/guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from '../common/guards/need-to-change-password.guard';
import { UpdateMeDto } from './dto/update-user.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { TokenUtils } from '../auth/utils/auth.util';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenUtils: TokenUtils,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: AccessJWTPayload) {
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
    @CurrentUser() user: AccessJWTPayload,
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
    @CurrentUser() user: AccessJWTPayload,
    @Body() updateEmailDto: UpdateEmailDto,
  ) {
    const userId = user.sub;
    const { email, password } = updateEmailDto;

    await this.usersService.updateEmail(email, password, userId);

    return {
      success: true,
      message:
        'Email update requested. Please check your new email for verification.',
    };
  }

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Patch('verify-email-update/:token')
  async verifyEmailUpdate(
    @CurrentUser() user: AccessJWTPayload,
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
      provider: user.provider,
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

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard, NeedToChangePasswordGuard)
  @Patch('password')
  async updatePassword(
    @CurrentUser() user: AccessJWTPayload,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const { sub, email, jti, exp, provider, needToChangePassword } = user;
    const { currentPassword, newPassword } = updatePasswordDto;

    if (provider !== 'local' && needToChangePassword) {
      throw new BadRequestException(
        'Password change is not allowed for social login users. Set a password instead.',
      );
    }

    await this.usersService.updatePassword(
      sub,
      currentPassword,
      newPassword,
      email,
      jti!,
      exp! - Math.floor(Date.now() / 1000),
    );

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  }

  @UseGuards(JwtAuthGuard, IsEmailVerifiedGuard)
  @Patch('set-password')
  async setPassword(
    @CurrentUser() user: AccessJWTPayload,
    @Body() setPasswordDto: SetPasswordDto,
  ) {
    const { sub, email, provider } = user;
    const { newPassword } = setPasswordDto;

    if (provider === 'local') {
      throw new BadRequestException(
        'This endpoint is not allowed for local users.',
      );
    }

    if (user.needToChangePassword === false) {
      throw new BadRequestException(
        'Password is already set. Use the update password endpoint instead.',
      );
    }

    await this.usersService.setPassword(sub, newPassword, email);

    return {
      success: true,
      message: 'Password set successfully.',
    };
  }
}
