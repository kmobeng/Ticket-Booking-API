import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { User } from '../../generated/prisma/client';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  async registerService(
    registerDto: RegisterDto,
  ): Promise<Omit<User, 'password'>> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'This user already has an account. Please log in instead.',
      );
    }

    const hashpassword = await bcrypt.hash(registerDto.password, 12);

    const newUser = await this.prismaService.user.create({
      data: { ...registerDto, password: hashpassword },
    });

    const { password: _, ...userWithoutPassword } = newUser;

    return userWithoutPassword;
  }

  async createRefreshToken(
    refreshToken: string,
    userId: string,
    expiresAt: Date,
  ): Promise<void> {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.prismaService.refreshToken.create({
      data: { token: hash, userId, expiresAt },
    });
  }
}
