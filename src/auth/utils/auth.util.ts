import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccessJWTPayload,
  RefreshJWTPayload,
} from '../interfaces/jwt.interface';
import type { Response } from 'express';

@Injectable()
export class TokenUtils {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  setRefreshTokenCookieOptions() {
    const RefreshCookieOptions: any = {
      expires: new Date(
        Date.now() +
          Number(this.configService.get('REFRESH_JWT_COOKIE_EXPIRES_IN')) *
            24 *
            60 *
            60 *
            1000,
      ),
      httpOnly: true,
    };

    if (this.configService.get('NODE_ENV') === 'production') {
      RefreshCookieOptions.secure = true;
      RefreshCookieOptions.sameSite = 'strict';
    }
    return RefreshCookieOptions;
  }

  generateAccessToken(payload: AccessJWTPayload): string {
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });
    return token;
  }

  sendRefreshToken(res: Response, refreshToken: string): void {
    const refreshTokenCookieOptions = this.setRefreshTokenCookieOptions();
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
  }

  generateRefreshToken(payload: RefreshJWTPayload): string {
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_JWT_SECRET'),
      expiresIn: this.configService.get('REFRESH_JWT_EXPIRES_IN'),
    });
    return refreshToken;
  }
}
