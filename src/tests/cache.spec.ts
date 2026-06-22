import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CreatorsModule } from '../creators/creators.module';
import { TiersModule } from '../tiers/tiers.module';
import { PrismaService } from '../common/prisma.service';

describe('Cache Integration', () => {
  let app: INestApplication;

  const mockCreator = {
    id: 'c1',
    userId: 'u1',
    stellarAddress: 'addr1',
    displayName: 'Alice',
    bio: null,
    avatarUrl: null,
    totalEarned: '0',
    featured: false,
    featuredOrder: 0,
    registeredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTiers = [
    { id: 't1', creatorId: 'c1', onChainId: 1, name: 'Basic', priceUsdc: '10', active: true },
    { id: 't2', creatorId: 'c1', onChainId: 2, name: 'Premium', priceUsdc: '20', active: true },
  ];

  const mockPrisma = {
    creator: {
      findUnique: jest.fn(({ where: { stellarAddress } }: any) => {
        if (stellarAddress === 'addr1') return mockCreator;
        return null;
      }),
      update: jest.fn(({ where: { id }, data }: any) => {
        const c = mockCreator;
        return Promise.resolve({ ...c, ...data });
      }),
      findMany: jest.fn(() => Promise.resolve([mockCreator])),
      count: jest.fn(() => Promise.resolve(1)),
    },
    tier: {
      findMany: jest.fn(() => Promise.resolve(mockTiers)),
      count: jest.fn(() => Promise.resolve(2)),
    },
    fan: { count: jest.fn().mockResolvedValue(0) },
    pass: { count: jest.fn().mockResolvedValue(0) },
    user: { count: jest.fn().mockResolvedValue(0) },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CreatorsModule, TiersModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /creators/:address', () => {
    it('should return X-Cache: MISS on first request', async () => {
      const res = await request(app.getHttpServer())
        .get('/creators/addr1')
        .expect(200);

      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.body.stellarAddress).toBe('addr1');
    });

    it('should return X-Cache: HIT on second request', async () => {
      await request(app.getHttpServer())
        .get('/creators/addr1')
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/creators/addr1')
        .expect(200);

      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.body.stellarAddress).toBe('addr1');
    });
  });

  describe('GET /tiers', () => {
    it('should return X-Cache: MISS on first request', async () => {
      const res = await request(app.getHttpServer())
        .get('/tiers')
        .expect(200);

      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.body.data).toHaveLength(2);
    });

    it('should return X-Cache: HIT on second request', async () => {
      await request(app.getHttpServer())
        .get('/tiers')
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/tiers')
        .expect(200);

      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate creator cache on update', async () => {
      // First request - MISS
      await request(app.getHttpServer())
        .get('/creators/addr1')
        .expect(200);

      // Second request - HIT
      const res2 = await request(app.getHttpServer())
        .get('/creators/addr1')
        .expect(200);
      expect(res2.headers['x-cache']).toBe('HIT');

      // Update creator
      await request(app.getHttpServer())
        .patch('/creators/profile')
        .send({ displayName: 'Alice Updated' })
        .expect(200);

      // Third request - MISS (cache invalidated)
      const res3 = await request(app.getHttpServer())
        .get('/creators/addr1')
        .expect(200);
      expect(res3.headers['x-cache']).toBe('MISS');
    });
  });
});