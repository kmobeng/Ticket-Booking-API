import { Strategy } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import crypto from 'crypto';

@Injectable()
export class GoogleAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      callbackURL: '/api/v1/auth/google/redirect',
      clientID: configService.get('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET')!,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, name, emails } = profile;

    const currentUser = await this.prismaService.user.findFirst({
      where: { googleId: id },
    });

    if (currentUser) {
      return { ...currentUser, authAction: 'login' };
    } else {
      const email = emails[0].value;
      if (!email) {
        throw new UnauthorizedException(
          'An email address is required to log in with Google. Please sign in with an account that allows access to your email address.',
        );
      }

      const existingEmail = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        const updatedUser = await this.prismaService.user.update({
          where: { email },
          data: { googleId: id },
        });

        return { ...updatedUser, authAction: 'login' };
      }

      const password = crypto.randomBytes(16).toString('hex');
      const hashedPassword = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');

      const newUser = await this.prismaService.user.create({
        data: {
          name: name.givenName + ' ' + name.familyName,
          email,
          password: hashedPassword, //dummy password
          googleId: id,
          provider: 'google',
          needToChangePassword: true,
          isEmailVerified: true,
        },
      });

      return { ...newUser, authAction: 'register' };
    }
  }
}
