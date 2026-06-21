import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../common/prisma.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [PrismaModule, StellarModule],
  controllers: [HealthController],
})
export class HealthModule {}
