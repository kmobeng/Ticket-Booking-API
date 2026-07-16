import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { TokenUtils } from './utils/auth.util';
import type { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/auth-guard';
import { currentUser } from './decorators/currentUser.decorator';
import type { AccessJWTPayload } from './interfaces/jwt.interface';
import crypto from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenUtils: TokenUtils,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.registerService(registerDto);

    const { refreshToken, ...userWithoutRefreshToken } = user;

    this.tokenUtils.sendRefreshToken(res, refreshToken);
    const token = this.tokenUtils.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      token,
      data: userWithoutRefreshToken,
    };
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password } = body;

    const user = await this.authService.loginService(email, password);

    const { refreshToken, ...userWithoutRefreshToken } = user;

    this.tokenUtils.sendRefreshToken(res, refreshToken);

    const token = this.tokenUtils.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      token,
      data: userWithoutRefreshToken,
    };
  }

  @Post('refresh')
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refreshToken'];

    if (!token) {
      throw new BadRequestException('Refresh token is missing');
    }

    const payload = this.tokenUtils.verifyRefreshToken(token);

    const hashToken = crypto.createHash('sha256').update(token).digest('hex');

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokenService(hashToken, payload.sub);

    this.tokenUtils.sendRefreshToken(res, newRefreshToken);

    return { success: true, accessToken: newAccessToken };
  }
}
