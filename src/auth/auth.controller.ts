import { Body, Controller, Post, Res } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { TokenUtils } from './utils/auth.util';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prismaService: PrismaService,
    private readonly tokenUtils: TokenUtils,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.registerService(registerDto);

    const refreshToken = this.tokenUtils.generateRefreshToken({
      sub: user.id,
    });

    await this.authService.createRefreshToken(
      refreshToken,
      user.id,
      new Date(
        Date.now() +
          this.configService.get('REFRESH_JWT_COOKIE_EXPIRES_IN') *
            24 *
            60 *
            60 *
            1000,
      ),
    );

    this.tokenUtils.sendRefreshToken(res, refreshToken);
    const token = this.tokenUtils.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      token,
      data: user,
    };
  }
}
