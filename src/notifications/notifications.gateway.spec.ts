import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../common/prisma.service';
import { Server } from 'socket.io';
import { Socket } from 'socket.io-client';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let prismaService: PrismaService;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        query: {},
      },
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: PrismaService,
          useValue: {
            creator: {
              findUnique: jest.fn(),
            },
            pass: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock the server property
    gateway['server'] = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should join room based on fanAddress', () => {
      mockSocket.handshake.query.fanAddress = 'GABC123XYZ';

      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('fan:GABC123XYZ');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client without fanAddress', () => {
      mockSocket.handshake.query.fanAddress = undefined;

      gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnect', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(mockSocket);

      expect(loggerSpy).toHaveBeenCalledWith(`Client ${mockSocket.id} disconnected`);
    });
  });

  describe('emitNewTierEvent', () => {
    it('should emit new_tier event to fans with active passes', async () => {
      const creatorAddress = 'GCREATOR123';
      const tierData = { id: 'tier-1', name: 'Gold Tier' };

      (prismaService.creator.findUnique as jest.Mock).mockResolvedValue({
        id: 'creator-1',
        stellarAddress: creatorAddress,
      });

      (prismaService.pass.findMany as jest.Mock).mockResolvedValue([
        {
          fan: { stellarAddress: 'GFAN1' },
        },
        {
          fan: { stellarAddress: 'GFAN2' },
        },
      ]);

      await gateway.emitNewTierEvent(creatorAddress, tierData);

      expect(mockServer.to).toHaveBeenCalledWith('fan:GFAN1');
      expect(mockServer.to).toHaveBeenCalledWith('fan:GFAN2');
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
      expect(mockServer.emit).toHaveBeenCalledWith('new_tier', {
        creatorAddress,
        tier: tierData,
        timestamp: expect.any(String),
      });
    });

    it('should not emit if creator not found', async () => {
      const creatorAddress = 'GCREATOR123';
      const tierData = { id: 'tier-1', name: 'Gold Tier' };

      (prismaService.creator.findUnique as jest.Mock).mockResolvedValue(null);

      await gateway.emitNewTierEvent(creatorAddress, tierData);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should not emit if no active passes exist', async () => {
      const creatorAddress = 'GCREATOR123';
      const tierData = { id: 'tier-1', name: 'Gold Tier' };

      (prismaService.creator.findUnique as jest.Mock).mockResolvedValue({
        id: 'creator-1',
        stellarAddress: creatorAddress,
      });

      (prismaService.pass.findMany as jest.Mock).mockResolvedValue([]);

      await gateway.emitNewTierEvent(creatorAddress, tierData);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('emitPassExpiringSoonEvent', () => {
    it('should emit pass_expiring_soon event to fan', async () => {
      const fanAddress = 'GFAN1';
      const passData = {
        id: 'pass-1',
        tierName: 'Gold Tier',
        creatorName: 'Creator Name',
        expiresAt: new Date(),
      };

      await gateway.emitPassExpiringSoonEvent(fanAddress, passData);

      expect(mockServer.to).toHaveBeenCalledWith('fan:GFAN1');
      expect(mockServer.emit).toHaveBeenCalledWith('pass_expiring_soon', {
        pass: passData,
        timestamp: expect.any(String),
      });
    });
  });

  describe('handleJoin', () => {
    it('should join room on join event', () => {
      const data = { fanAddress: 'GFAN1' };

      const result = gateway.handleJoin(mockSocket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('fan:GFAN1');
      expect(result).toEqual({ event: 'joined', room: 'fan:GFAN1' });
    });
  });

  describe('handleLeave', () => {
    it('should leave room on leave event', () => {
      const data = { fanAddress: 'GFAN1' };

      const result = gateway.handleLeave(mockSocket, data);

      expect(mockSocket.leave).toHaveBeenCalledWith('fan:GFAN1');
      expect(result).toEqual({ event: 'left', room: 'fan:GFAN1' });
    });
  });
});
