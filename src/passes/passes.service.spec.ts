import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PassesService } from './passes.service';
import { PrismaService } from '../common/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { EmailService } from '../notifications/email.service';

describe('PassesService', () => {
  let service: PassesService;
  let prisma: PrismaService;
  let webhooksService: WebhooksService;

  const mockPrismaService = {
    creator: {
      findUnique: jest.fn(),
    },
    tier: {
      findFirst: jest.fn(),
    },
    fan: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    pass: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockWebhooksService = {
    deliverPassPurchaseWebhook: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailService = {
    sendPassPurchaseEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<PassesService>(PassesService);
    prisma = module.get<PrismaService>(PrismaService);
    webhooksService = module.get<WebhooksService>(WebhooksService);

    jest.clearAllMocks();
  });

  describe('upsertFromChain', () => {
    const mockData = {
      onChainId: BigInt(1),
      tierOnChainId: 10,
      creatorAddress: 'GB_CREATOR',
      fanAddress: 'GB_FAN',
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      txHash: 'tx-hash',
    };

    const mockCreator = { id: 'creator-uuid', stellarAddress: 'GB_CREATOR' };
    const mockTier = { id: 'tier-uuid', onChainId: 10, creatorId: 'creator-uuid' };
    const mockFan = { id: 'fan-uuid', stellarAddress: 'GB_FAN' };
    const mockPass = { id: 'pass-uuid', onChainId: BigInt(1), creatorId: 'creator-uuid' };

    beforeEach(() => {
      mockPrismaService.creator.findUnique.mockResolvedValue(mockCreator);
      mockPrismaService.tier.findFirst.mockResolvedValue(mockTier);
      mockPrismaService.fan.upsert.mockResolvedValue(mockFan);
    });

    it('should create new pass and trigger webhook delivery', async () => {
      mockPrismaService.pass.findUnique.mockResolvedValue(null);
      mockPrismaService.pass.upsert.mockResolvedValue(mockPass);

      const result = await service.upsertFromChain(mockData);

      expect(prisma.pass.findUnique).toHaveBeenCalledWith({
        where: { onChainId: mockData.onChainId },
      });
      expect(prisma.pass.upsert).toHaveBeenCalled();
      expect(prisma.pass.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            txHash: mockData.txHash,
          }),
        }),
      );
      expect(webhooksService.deliverPassPurchaseWebhook).toHaveBeenCalledWith(
        mockCreator.id,
        mockPass
      );
      expect(result).toEqual(mockPass);
    });

    it('should update existing pass and NOT trigger webhook delivery', async () => {
      mockPrismaService.pass.findUnique.mockResolvedValue(mockPass);
      mockPrismaService.pass.upsert.mockResolvedValue(mockPass);

      const result = await service.upsertFromChain(mockData);

      expect(prisma.pass.findUnique).toHaveBeenCalledWith({
        where: { onChainId: mockData.onChainId },
      });
      expect(prisma.pass.upsert).toHaveBeenCalled();
      expect(webhooksService.deliverPassPurchaseWebhook).not.toHaveBeenCalled();
      expect(result).toEqual(mockPass);
    });
  });

  describe('getReceipt', () => {
    const purchasedAt = new Date('2026-06-21T12:00:00.000Z');
    const expiresAt = new Date('2026-07-21T12:00:00.000Z');
    const mockPassReceipt = {
      id: 'pass-uuid',
      onChainId: BigInt(42),
      active: true,
      purchasedAt,
      expiresAt,
      txHash: 'stellar-tx-hash',
      fan: {
        id: 'fan-uuid',
        stellarAddress: 'GB_FAN',
      },
      tier: {
        id: 'tier-uuid',
        name: 'Gold',
        priceUsdc: { toString: () => '12.50' },
      },
      creator: {
        id: 'creator-uuid',
        stellarAddress: 'GB_CREATOR',
        displayName: 'Creator',
      },
    };

    it('should return purchase receipt details for the pass owner', async () => {
      mockPrismaService.pass.findUnique.mockResolvedValue(mockPassReceipt);

      const result = await service.getReceipt('pass-uuid', 'GB_FAN');

      expect(prisma.pass.findUnique).toHaveBeenCalledWith({
        where: { id: 'pass-uuid' },
        include: {
          tier: true,
          creator: true,
          fan: true,
        },
      });
      expect(result).toEqual({
        pass: {
          id: 'pass-uuid',
          onChainId: '42',
          active: true,
          expiresAt,
        },
        tier: mockPassReceipt.tier,
        creator: mockPassReceipt.creator,
        purchasedAt,
        amount: '12.50',
        txHash: 'stellar-tx-hash',
      });
    });

    it('should reject receipt access for a different fan', async () => {
      mockPrismaService.pass.findUnique.mockResolvedValue(mockPassReceipt);

      await expect(service.getReceipt('pass-uuid', 'GB_OTHER')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should throw when the pass is not found', async () => {
      mockPrismaService.pass.findUnique.mockResolvedValue(null);

      await expect(service.getReceipt('missing-pass', 'GB_FAN')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    const mockPasses = [
      {
        id: 'pass-uuid',
        tierId: '550e8400-e29b-41d4-a716-446655440000',
        active: true,
      },
    ];

    beforeEach(() => {
      mockPrismaService.pass.findMany.mockResolvedValue(mockPasses);
      mockPrismaService.pass.count.mockResolvedValue(mockPasses.length);
    });

    it('should filter passes by fan, tier, active, and unexpired status with pagination', async () => {
      const result = await service.findAll({
        fan: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        tier_id: '550e8400-e29b-41d4-a716-446655440000',
        active: true,
        expired: false,
        page: 2,
        limit: 10,
      });

      expect(prisma.pass.findMany).toHaveBeenCalledWith({
        where: {
          fan: {
            stellarAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          },
          tierId: '550e8400-e29b-41d4-a716-446655440000',
          active: true,
          expiresAt: { gt: expect.any(Date) },
        },
        skip: 10,
        take: 10,
        include: {
          tier: true,
          creator: true,
          fan: true,
        },
        orderBy: {
          purchasedAt: 'desc',
        },
      });
      expect(prisma.pass.count).toHaveBeenCalledWith({
        where: {
          fan: {
            stellarAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          },
          tierId: '550e8400-e29b-41d4-a716-446655440000',
          active: true,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(result).toEqual({
        data: mockPasses,
        total: 1,
        page: 2,
        limit: 10,
      });
    });

    it('should filter expired inactive passes', async () => {
      await service.findAll({
        active: false,
        expired: true,
      });

      expect(prisma.pass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            active: false,
            expiresAt: { lte: expect.any(Date) },
          },
          skip: 0,
          take: 20,
        }),
      );
      expect(prisma.pass.count).toHaveBeenCalledWith({
        where: {
          active: false,
          expiresAt: { lte: expect.any(Date) },
        },
      });
    });
  });
});
