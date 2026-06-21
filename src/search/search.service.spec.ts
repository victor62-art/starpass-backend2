import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaService } from '../common/prisma.service';

describe('SearchService', () => {
  let service: SearchService;

  const mockCreator = { id: 'c1', displayName: 'Alice Music', bio: 'A music creator' };
  const mockTier = { id: 't1', name: 'Gold Pass', description: 'Gold tier access', active: true };

  const mockPrisma = {
    creator: { findMany: jest.fn() },
    tier: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  it('throws 400 when query is shorter than 2 characters', async () => {
    await expect(service.search('a')).rejects.toThrow(BadRequestException);
    await expect(service.search('')).rejects.toThrow(BadRequestException);
  });

  it('returns matching creators and tiers', async () => {
    mockPrisma.creator.findMany.mockResolvedValue([mockCreator]);
    mockPrisma.tier.findMany.mockResolvedValue([mockTier]);

    const result = await service.search('gold');

    expect(result).toEqual({ creators: [mockCreator], tiers: [mockTier] });
    expect(mockPrisma.creator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
    expect(mockPrisma.tier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('returns empty arrays when nothing matches', async () => {
    mockPrisma.creator.findMany.mockResolvedValue([]);
    mockPrisma.tier.findMany.mockResolvedValue([]);

    const result = await service.search('zzznomatch');

    expect(result).toEqual({ creators: [], tiers: [] });
  });
});
