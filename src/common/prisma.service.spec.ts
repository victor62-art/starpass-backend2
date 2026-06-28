import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('slow query tracking', () => {
    it('should initialize with zero slow queries', () => {
      expect(service.getSlowQueryCount()).toBe(0);
    });

    it('should reset slow query count', () => {
      // Simulate incrementing slow queries
      (service as any).slowQueryCount = 5;
      expect(service.getSlowQueryCount()).toBe(5);
      
      service.resetSlowQueryCount();
      expect(service.getSlowQueryCount()).toBe(0);
    });
  });

  describe('connection pool metrics', () => {
    it('should return connection pool metrics', () => {
      const metrics = service.getConnectionPoolMetrics();
      
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('maxConnections');
      expect(metrics).toHaveProperty('utilizationPercent');
      expect(typeof metrics.activeConnections).toBe('number');
      expect(typeof metrics.maxConnections).toBe('number');
      expect(typeof metrics.utilizationPercent).toBe('number');
    });

    it('should use default pool size when DATABASE_POOL_SIZE is not set', () => {
      const originalPoolSize = process.env.DATABASE_POOL_SIZE;
      delete process.env.DATABASE_POOL_SIZE;
      
      const metrics = service.getConnectionPoolMetrics();
      expect(metrics.maxConnections).toBe(10);
      
      if (originalPoolSize) {
        process.env.DATABASE_POOL_SIZE = originalPoolSize;
      }
    });

    it('should use custom pool size when DATABASE_POOL_SIZE is set', () => {
      const originalPoolSize = process.env.DATABASE_POOL_SIZE;
      process.env.DATABASE_POOL_SIZE = '20';
      
      const metrics = service.getConnectionPoolMetrics();
      expect(metrics.maxConnections).toBe(20);
      
      if (originalPoolSize) {
        process.env.DATABASE_POOL_SIZE = originalPoolSize;
      } else {
        delete process.env.DATABASE_POOL_SIZE;
      }
    });
  });

  describe('query latency measurement', () => {
    it('should measure query latency', async () => {
      // Mock $queryRaw to return immediately
      service.$queryRaw = jest.fn().mockResolvedValue([1]);
      
      const latency = await service.getQueryLatency();
      expect(typeof latency).toBe('number');
      expect(latency).toBeGreaterThanOrEqual(0);
    });
  });
});
