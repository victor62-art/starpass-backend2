import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../common/prisma.service';

describe('CreatorsService', () => {
  let service: CreatorsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    creator: {
      findUnique: jest.fn(),
    },
    pass: {
      findMany: jest.fn(),
    },
    block: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CreatorsService>(CreatorsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getRevenue', () => {
    it('should throw NotFoundException when creator is missing', async () => {
      mockPrismaService.creator.findUnique.mockResolvedValue(null);
      await expect(service.getRevenue('user-123')).rejects.toThrow(NotFoundException);
    });

    it('should return revenue summary and top tiers sorted by revenue', async () => {
      const creator = { id: 'creator-1', totalEarned: '1200.50' };
      const passes = [
        {
          id: 'pass-1',
          tier: { id: 'tier-123', name: 'VIP Access', priceUsdc: '8500.00' },
        },
        {
          id: 'pass-2',
          tier: { id: 'tier-456', name: 'Early Bird', priceUsdc: '5000.00' },
        },
        {
          id: 'pass-3',
          tier: { id: 'tier-789', name: 'Base Tier', priceUsdc: '1949.50' },
        },
        {
          id: 'pass-4',
          tier: { id: 'tier-456', name: 'Early Bird', priceUsdc: '5000.00' },
        },
      ];

      mockPrismaService.creator.findUnique.mockResolvedValue(creator);
      mockPrismaService.pass.findMany.mockResolvedValue(passes);

      const result = await service.getRevenue('user-123');

      expect(result).toEqual({
        totalRevenue: 20449.5,
        totalPasses: 4,
        pendingBalance: 1200.5,
        topTiers: [
          { id: 'tier-456', name: 'Early Bird', revenue: 10000.0 },
          { id: 'tier-123', name: 'VIP Access', revenue: 8500.0 },
          { id: 'tier-789', name: 'Base Tier', revenue: 1949.5 },
        ],
      });

      expect(prisma.creator.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(prisma.pass.findMany).toHaveBeenCalledWith({
        where: { creatorId: creator.id },
        include: { tier: true },
      });
    });

    it('should return empty topTiers when there are no passes', async () => {
      const creator = { id: 'creator-1', totalEarned: '0' };
      mockPrismaService.creator.findUnique.mockResolvedValue(creator);
      mockPrismaService.pass.findMany.mockResolvedValue([]);

      const result = await service.getRevenue('user-123');

      expect(result).toEqual({
        totalRevenue: 0,
        totalPasses: 0,
        pendingBalance: 0,
        topTiers: [],
      });
    });
  });

  describe('blockFan', () => {
    it('should block a fan for a creator', async () => {
      const creator = { id: 'creator-uuid' };
      const block = {
        id: 'block-uuid',
        creatorId: creator.id,
        fanAddress: 'GB_FAN',
        reason: 'spam',
      };
      mockPrismaService.creator.findUnique.mockResolvedValue(creator);
      mockPrismaService.block.upsert.mockResolvedValue(block);

      const result = await service.blockFan(creator.id, {
        fanAddress: 'GB_FAN',
        reason: 'spam',
      });

      expect(prisma.creator.findUnique).toHaveBeenCalledWith({
        where: { id: creator.id },
      });
      expect(prisma.block.upsert).toHaveBeenCalledWith({
        where: {
          creatorId_fanAddress: {
            creatorId: creator.id,
            fanAddress: 'GB_FAN',
          },
        },
        update: {
          reason: 'spam',
        },
        create: {
          creatorId: creator.id,
          fanAddress: 'GB_FAN',
          reason: 'spam',
        },
      });
      expect(result).toEqual(block);
    });

    it('should throw when blocking for a missing creator', async () => {
      mockPrismaService.creator.findUnique.mockResolvedValue(null);

      await expect(
        service.blockFan('missing-creator', { fanAddress: 'GB_FAN' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.block.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unblockFan', () => {
    it('should unblock a fan for a creator', async () => {
      const creator = { id: 'creator-uuid' };
      mockPrismaService.creator.findUnique.mockResolvedValue(creator);
      mockPrismaService.block.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unblockFan(creator.id, 'GB_FAN');

      expect(prisma.block.deleteMany).toHaveBeenCalledWith({
        where: {
          creatorId: creator.id,
          fanAddress: 'GB_FAN',
        },
      });
      expect(result).toEqual({
        creatorId: creator.id,
        fanAddress: 'GB_FAN',
        blocked: false,
      });
    });

    it('should throw when unblocking for a missing creator', async () => {
      mockPrismaService.creator.findUnique.mockResolvedValue(null);

      await expect(service.unblockFan('missing-creator', 'GB_FAN')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.block.deleteMany).not.toHaveBeenCalled();
    });
  });
});
