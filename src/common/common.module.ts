import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/auth.guard';
import { IsEmailVerifiedGuard } from './guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from './guards/need-to-change-password.guard';
import { RoleGuard } from './guards/role.guard';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  ],
  exports: [
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  ],
})
export class CommonModule {}
