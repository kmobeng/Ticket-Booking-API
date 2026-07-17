import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenUtils } from './utils/auth.util';
import { OutboxModule } from '../outbox/outbox.module';
import { RedisModule } from '../redis/redis.module';
import { GoogleAuthStrategy } from './strategies/google-auth.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    OutboxModule,
    RedisModule,
    PassportModule.register({
      session: false,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    ConfigService,
    JwtService,
    TokenUtils,
    GoogleAuthStrategy,
  ],
})
export class AuthModule {}
