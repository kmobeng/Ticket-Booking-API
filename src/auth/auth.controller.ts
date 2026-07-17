import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  Param,
  Get,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { TokenUtils } from './utils/auth.util';
import type { Response, Request } from 'express';
import { LoginDto } from './dto/login.dto';
import crypto from 'crypto';
import { JwtAuthGuard } from './guards/auth-guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import bcrypt from 'bcrypt';
import { currentUser } from './decorators/currentUser.decorator';
import type { AccessJWTPayload } from './interfaces/jwt.interface';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../../generated/prisma/client';

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
      isEmailVerified: user.isEmailVerified,
      needToChangePassword: user.needToChangePassword,
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
      isEmailVerified: user.isEmailVerified,
      needToChangePassword: user.needToChangePassword,
    });

    return {
      success: true,
      token,
      data: userWithoutRefreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const token = req.cookies['refreshToken'];

    if (!token) {
      throw new BadRequestException('Refresh token is missing');
    }

    const payload = this.tokenUtils.verifyRefreshToken(token);

    const { jti } = this.tokenUtils.verifyAccessToken(
      req.headers.authorization?.split(' ')[1] || '',
    );

    const remainingTTl = payload.exp! - Math.floor(Date.now() / 1000);

    await this.authService.logoutService(
      payload.sub,
      token,
      remainingTTl,
      jti!,
    );

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    return { success: true, message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPasswordService(body.email);

    return {
      success: true,
      message:
        'If an email with this account exist, a reset url has been sent to the email address.',
    };
  }

  @Post('reset-password/:token')
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Param('token') token: string,
  ) {
    const hashToken = crypto.createHash('sha256').update(token).digest('hex');

    const { password } = body;
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.authService.resetPasswordService(hashToken, hashedPassword);

    return {
      success: true,
      message:
        'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('request-email-verification')
  async requestEmailVerification(@currentUser() user: AccessJWTPayload) {
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.authService.requestEmailVerificationService(
      user.email,
      user.sub,
    );

    return {
      success: true,
      message:
        'If an email with this account exist, a verification token has been sent to the email address.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-email/:token')
  async verifyEmail(
    @Param('token') token: string,
    @currentUser() user: AccessJWTPayload,
  ) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await this.authService.verifyEmailTokenService(
      hashedToken,
      user.sub,
      user.jti!,
      user.exp! - Math.floor(Date.now() / 1000),
    );

    const newToken = this.tokenUtils.generateAccessToken({
      sub: user.sub,
      email: user.email,
      role: user.role,
      isEmailVerified: true,
      needToChangePassword: user.needToChangePassword,
    });

    return {
      success: true,
      token: newToken,
      message: 'Email verified successfully.',
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User & { authAction: 'login' | 'register' };

    const payload: AccessJWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      needToChangePassword: user.needToChangePassword,
    };

    const token = this.tokenUtils.generateAccessToken(payload);

    const refreshToken = this.tokenUtils.generateRefreshToken(payload);

    await this.authService.createRefreshToken(refreshToken, user.id);

    this.tokenUtils.sendRefreshToken(res, refreshToken);

    const { password: _, authAction: __, ...userWithoutPassword } = user;

    return {
      success: true,
      token,
      message:
        user.authAction === 'login'
          ? 'Logged in successfully'
          : 'Registered successfully. Please change your password to continue.',
      data: userWithoutPassword,
    };
  }
}
