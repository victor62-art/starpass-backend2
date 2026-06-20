import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPassPurchaseEmail(
    creatorEmail: string,
    fanAddress: string,
    tierName: string,
    amount: string | number,
  ): Promise<void> {
    try {
      const fromEmail = this.configService.get<string>('FROM_EMAIL', 'noreply@starpass.com');

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Pass Purchased!</h2>
          <p>Great news! A fan has just purchased a pass from you.</p>
          <ul>
            <li><strong>Fan Address:</strong> ${fanAddress}</li>
            <li><strong>Tier:</strong> ${tierName}</li>
            <li><strong>Amount:</strong> ${amount} USDC</li>
          </ul>
          <p>Log in to your dashboard to view more details.</p>
        </div>
      `;

      await this.transporter.sendMail({
        from: fromEmail,
        to: creatorEmail,
        subject: 'New Pass Purchase - StarPass',
        html,
      });

      this.logger.log(`Email notification sent to ${creatorEmail} for pass purchase.`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${creatorEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
