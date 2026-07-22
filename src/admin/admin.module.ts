import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [AuthModule, OutboxModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
