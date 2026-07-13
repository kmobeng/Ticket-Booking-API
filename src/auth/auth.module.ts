import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenUtils } from './utils/auth.util';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    ConfigService,
    JwtService,
    TokenUtils,
  ],
})
export class AuthModule {}
