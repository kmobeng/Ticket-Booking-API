import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { User } from '../../generated/prisma/client';
import crypto from 'crypto';
import { TokenUtils } from './utils/auth.util';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenUtils: TokenUtils,
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
              parseInt(process.env.REFRESH_JWT_COOKIE_EXPIRES_IN || '7') *
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
}
