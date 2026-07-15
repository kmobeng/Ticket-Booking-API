import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'token-email':
        this.logger.log(`Sending token email to ${job.data.to}`);
        // Here you would call your email service to send the email
        break;
    }
  }
}
