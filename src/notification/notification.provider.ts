import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailService } from '../common/utils/email.util';
import { ConfigService } from '@nestjs/config';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-email-verification': {
        const { to, token } = job.data;

        const message = `Please verify your email using the following token: ${token}. This token will expire in 10 minutes.`;

        await this.emailService.sendEmailDev({
          email: to,
          subject: 'Email Verification (Expired in 10 minutes)',
          message: message,
        });
        break;
      }
      case 'send-password-reset': {
        const { to, token } = job.data;

        const resetURL = `${this.configService.get('APP_URL')}/reset-password/${token}`;

        const message = `You requested a password reset. Please click on the following link to reset your password: ${resetURL}
       This link is valid for 10 minutes. If you did not request this, please ignore this email.`;

        await this.emailService.sendEmailDev({
          email: to,
          subject: 'Password Reset Request (Expired in 10 minutes)',
          message: message,
        });
        break;
      }
      case 'send-email-update': {
        const { to, token } = job.data;

        const message = `Your email update request has been received. Please verify your new email using the following token: ${token}. This token will expire in 10 minutes.`;

        await this.emailService.sendEmailDev({
          email: to,
          subject: 'Email Update Verification (Expired in 10 minutes)',
          message: message,
        });
        break;
      }
      case 'send-password-change': {
        const { email } = job.data;

        const message = `Your password has been changed successfully. If you did not perform this action, please contact support immediately.`;

        await this.emailService.sendEmailDev({
          email: email,
          subject: 'Password Change Notification',
          message: message,
        });
        break;
      }
      case 'send-password-set': {
        const { email } = job.data;

        const message = `Your password has been set successfully. If you did not perform this action, please contact support immediately.`;

        await this.emailService.sendEmailDev({
          email: email,
          subject: 'Password Set Notification',
          message: message,
        });
        break;
      }
      case 'send-organizer-verified': {
        const { email, name } = job.data;

        const message = `Congratulations ${name}! Your application for organizer status has been verified successfully. You can now access all the features available to organizers.`;

        await this.emailService.sendEmailDev({
          email: email,
          subject: 'Organizer Verification Successful',
          message: message,
        });
        break;
      }
      case 'send-organizer-unverified': {
        const { email, name } = job.data;

        const message = `Dear ${name}, your application for organizer status has been unverified. If you have any questions, please contact support. We apologize for any inconvenience this may cause.`;

        await this.emailService.sendEmailDev({
          email: email,
          subject: 'Organizer Verification Unsuccessful',
          message: message,
        });
        break;
      }
      default:
        this.logger.warn(`No handler for job name: ${job.name}`);
    }
  }
}
