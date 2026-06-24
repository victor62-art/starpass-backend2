import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private slowQueryCount = 0;
  private readonly SLOW_QUERY_THRESHOLD_MS = 1000;

  constructor() {
    const isTestEnv = process.env.NODE_ENV === 'test';
    
    super({
      log: isTestEnv ? [] : [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    if (!isTestEnv) {
      this.setupQueryLogging();
    }
  }

  private setupQueryLogging() {
    (this as any).$on('query', (e: any) => {
      const duration = e.duration;
      
      if (duration > this.SLOW_QUERY_THRESHOLD_MS) {
        this.slowQueryCount++;
        this.logger.warn(
          `Slow query detected (${duration}ms): ${e.query}`,
        );
      }
    });

    (this as any).$on('error', (e: any) => {
      this.logger.error(`Prisma query error: ${e.message}`);
    });

    (this as any).$on('warn', (e: any) => {
      this.logger.warn(`Prisma warning: ${e.message}`);
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'test') {
      await this.$connect();
      this.logger.log('Database connected successfully');
    }
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV !== 'test') {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    }
  }

  getSlowQueryCount(): number {
    return this.slowQueryCount;
  }

  resetSlowQueryCount(): void {
    this.slowQueryCount = 0;
  }

  async getQueryLatency(): Promise<number> {
    const start = Date.now();
    await this.$queryRaw`SELECT 1`;
    return Date.now() - start;
  }

  getConnectionPoolMetrics(): { activeConnections: number; maxConnections: number; utilizationPercent: number } {
    const maxConnections = parseInt(process.env.DATABASE_POOL_SIZE || '10', 10);
    const activeConnections = 1;
    const utilizationPercent = (activeConnections / maxConnections) * 100;

    return {
      activeConnections,
      maxConnections,
      utilizationPercent,
    };
  }
}
