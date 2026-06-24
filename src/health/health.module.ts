import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../common/prisma.module';
import { StellarModule } from '../stellar/stellar.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [PrismaModule, StellarModule, MetricsModule],
  controllers: [HealthController],
})
export class HealthModule {}
