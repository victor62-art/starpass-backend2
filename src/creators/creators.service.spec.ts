import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../common/prisma.service';
import { UpdateCreatorDto } from './dto/update-creator.dto';

describe('CreatorsService', () => {
  let service: CreatorsService;

  const mockPrismaService = {
    creator: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pass: {
      findMany: jest.fn(),
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
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should save creator social links', async () => {
      const creator = { id: 'creator-1', stellarAddress: 'GB_CREATOR' };
      const dto = {
        twitterUrl: 'https://x.com/starpass',
        instagramUrl: 'https://instagram.com/starpass',
        websiteUrl: 'https://starpass.example',
      };
      const updatedCreator = { ...creator, ...dto };

      mockPrismaService.creator.findUnique.mockResolvedValue(creator);
      mockPrismaService.creator.update.mockResolvedValue(updatedCreator);

      await expect(service.update('GB_CREATOR', dto)).resolves.toEqual(updatedCreator);

      expect(mockPrismaService.creator.findUnique).toHaveBeenCalledWith({
        where: { stellarAddress: 'GB_CREATOR' },
      });
      expect(mockPrismaService.creator.update).toHaveBeenCalledWith({
        where: { id: creator.id },
        data: dto,
      });
    });

    it('should reject invalid social link URLs in the update DTO', async () => {
      const dto = new UpdateCreatorDto();
      dto.twitterUrl = 'not-a-url';
      dto.instagramUrl = 'https://';
      dto.websiteUrl = 'also-invalid';

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['twitterUrl', 'instagramUrl', 'websiteUrl']),
      );
    });

    it('should accept valid social link URLs in the update DTO', async () => {
      const dto = new UpdateCreatorDto();
      dto.twitterUrl = 'https://x.com/starpass';
      dto.instagramUrl = 'https://instagram.com/starpass';
      dto.websiteUrl = 'https://starpass.example';

      await expect(validate(dto)).resolves.toHaveLength(0);
    });
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

      expect(mockPrismaService.creator.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(mockPrismaService.pass.findMany).toHaveBeenCalledWith({
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
});
