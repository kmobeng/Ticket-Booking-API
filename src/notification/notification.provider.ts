import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailService } from '../common/utils/email.util';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-email-verification': {
        const { to, token } = job.data;

        const message = `Thank you for registering! Please verify your email using the following token: ${token}. This token will expire in 10 minutes.`;

        await this.emailService.sendEmailDev({
          email: to,
          subject: 'Email Verification (Expired in 10 minutes)',
          message: message,
        });
        break;
      }
    }
  }
}
