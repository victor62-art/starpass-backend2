import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../common/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EmailService, NotificationsService, NotificationsGateway],
  exports: [EmailService, NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
