import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '../../generated/prisma/client';
import bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { OutboxService } from '../outbox/outbox.service';
import crypto from 'crypto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
    private readonly outboxService: OutboxService,
    private readonly redisService: RedisService,
  ) {}

  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async updateProfile(
    id: string,
    name: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prismaService.user.update({
      where: { id },
      data: { name },
    });

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async updateEmail(email: string, password: string, userId: string) {
    const actualUser = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (actualUser && !(await bcrypt.compare(password, actualUser.password))) {
      throw new NotFoundException('Incorrect password');
    }

    const emailExists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (emailExists && emailExists.id !== userId) {
      throw new NotFoundException('Email is already in use');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { pendingEmail: email },
      });

      const { token, hashedToken } = this.authService.emailTokenGeneration();

      await tx.emailVerificationToken.create({
        data: {
          userId,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        },
      });

      await this.outboxService.createEvent(tx, {
        aggregateType: 'user',
        aggregateId: userId,
        eventType: 'EmailUpdateRequested',
        payload: { email, token },
      });
    });
  }

  async verifyEmailUpdateToken(
    userId: string,
    token: string,
    remainingTTL: number,
    jti: string,
  ): Promise<string> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const emailVerificationToken =
      await this.prismaService.emailVerificationToken.findFirst({
        where: {
          userId,
          token: hashedToken,
          expiresAt: { gt: new Date() },
        },
      });

    if (!emailVerificationToken) {
      throw new NotFoundException('Invalid or expired token');
    }

    const user = await this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { pendingEmail: true },
      });

      if (!user || !user.pendingEmail) {
        throw new NotFoundException('No pending email update found');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          email: user.pendingEmail,
          pendingEmail: null,
        },
      });

      await tx.emailVerificationToken.deleteMany({
        where: { userId },
      });

      return user.pendingEmail;
    });

    if (remainingTTL > 0) {
      await this.redisService
        .getClient()
        .set(`blacklist:${jti}`, 'true', 'EX', remainingTTL);
    }

    return user;
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    email: string,
    jti: string,
    remainingTTL: number,
  ): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new NotFoundException('Incorrect current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      await tx.refreshToken.deleteMany({
        where: { userId },
      });

      await this.outboxService.createEvent(tx, {
        aggregateType: 'user',
        aggregateId: userId,
        eventType: 'password-changed',
        payload: { email },
      });
    });

    if (remainingTTL > 0) {
      await this.redisService
        .getClient()
        .set(`blacklist:${jti}`, 'true', 'EX', remainingTTL);
    }
  }

  async setPassword(
    userId: string,
    newPassword: string,
    email: string,
  ): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          needToChangePassword: false,
        },
      });

      await this.outboxService.createEvent(tx, {
        aggregateType: 'user',
        aggregateId: userId,
        eventType: 'password-set',
        payload: { email },
      });
    });
  }
}
