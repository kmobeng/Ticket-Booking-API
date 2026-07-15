import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(@InjectQueue('notification') private notificationsQueue: Queue) {}

  async sendVerificationTokenEmail(to: string, token: string): Promise<void> {
    await this.notificationsQueue.add('verification-token-email', {
      to,
      token,
    });
    this.logger.log(
      `Verification token email notification job added for ${to}`,
    );
  }
}
