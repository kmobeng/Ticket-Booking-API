import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { NotificationModule } from './notification/notification.module';
import { OutboxModule } from './outbox/outbox.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { OrganizerModule } from './organizer/organizer.module';
import { AdminModule } from './admin/admin.module';
import { EventModule } from './event/event.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/common-throttler.guard';
import { ReservationModule } from './reservation/reservation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60 * 1000, //1 minute
          limit: 200000000000,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    RedisModule,
    QueueModule,
    NotificationModule,
    OutboxModule,
    UsersModule,
    CommonModule,
    OrganizerModule,
    AdminModule,
    EventModule,
    ReservationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
