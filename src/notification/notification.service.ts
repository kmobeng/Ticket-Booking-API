import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

type EmailVerificationData = {
  to: string;
  token: string;
};

type PasswordChangeData = {
  email: string;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(@InjectQueue('notification') private notificationsQueue: Queue) {}

  async enqueueEmailVerification(data: EmailVerificationData): Promise<void> {
    await this.notificationsQueue.add('send-email-verification', data);
  }

  async enqueuePasswordReset(data: EmailVerificationData): Promise<void> {
    await this.notificationsQueue.add('send-password-reset', data);
  }

  async enqueueEmailUpdate(data: EmailVerificationData): Promise<void> {
    await this.notificationsQueue.add('send-email-update', data);
  }

  async enqueuePasswordChange(data: PasswordChangeData): Promise<void> {
    await this.notificationsQueue.add('send-password-change', data);
  }

  async enqueueEmailSetPassword(data: PasswordChangeData): Promise<void> {
    await this.notificationsQueue.add('send-password-set', data);
  }
}
