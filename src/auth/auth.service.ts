import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { User } from '../../generated/prisma/client';
import crypto from 'crypto';
import { TokenUtils } from './utils/auth.util';
import { OutboxService } from '../outbox/outbox.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenUtils: TokenUtils,
    private readonly configService: ConfigService,
    private readonly outboxService: OutboxService,
  ) {}

  async registerService(
    registerDto: RegisterDto,
  ): Promise<Omit<User, 'password'> & { refreshToken: string }> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'This user already has an account. Please log in instead.',
      );
    }

    const hashpassword = await bcrypt.hash(registerDto.password, 12);

    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          password: hashpassword,
          name: registerDto.name,
        },
      });

      const refreshToken = this.tokenUtils.generateRefreshToken({
        sub: user.id,
      });

      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await tx.refreshToken.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt: new Date(
            Date.now() +
              Number(this.configService.get('REFRESH_JWT_COOKIE_EXPIRES_IN')) *
                24 *
                60 *
                60 *
                1000,
          ),
        },
      });

      const token = crypto.randomInt(100000, 999999).toString();
      const hashedVerificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: hashedVerificationToken,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });

      await this.outboxService.createEvent(tx, {
        aggregateId: user.id,
        aggregateType: 'user',
        eventType: 'user_registered',
        payload: {
          email: user.email,
          verificationToken: token,
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      return { ...userWithoutPassword, refreshToken };
    });
  }

  async loginService(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> & { refreshToken: string }> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ConflictException('Invalid email or password');
    }

    const refreshToken = this.tokenUtils.generateRefreshToken({
      sub: user.id,
    });

    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prismaService.refreshToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(
          Date.now() +
            Number(this.configService.get('REFRESH_JWT_COOKIE_EXPIRES_IN')) *
              24 *
              60 *
              60 *
              1000,
        ),
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return { ...userWithoutPassword, refreshToken };
  }

  async refreshTokenService(
    hashRefreshToken: string,
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Check if the refresh token exists and is valid
    const refreshTokenRecord = await this.prismaService.refreshToken.findFirst({
      where: {
        token: hashRefreshToken,
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
      throw new ConflictException('Invalid or expired refresh token');
    }

    // Generate new access and refresh tokens
    const accessPayload = {
      sub: refreshTokenRecord.user.id,
      email: refreshTokenRecord.user.email,
      role: refreshTokenRecord.user.role,
    };

    const newAccessToken = this.tokenUtils.generateAccessToken(accessPayload);

    const newRefreshToken = this.tokenUtils.generateRefreshToken({
      sub: refreshTokenRecord.user.id,
    });

    // Hash the new refresh token before storing it
    const newHashedRefreshToken = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    await this.prismaService.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: {
        token: newHashedRefreshToken,
        expiresAt: new Date(
          Date.now() +
            Number(this.configService.get('REFRESH_JWT_COOKIE_EXPIRES_IN')) *
              24 *
              60 *
              60 *
              1000,
        ),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}
