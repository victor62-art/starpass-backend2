import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../common/prisma.service";
import * as StellarSdk from "@stellar/stellar-sdk";

jest.mock("@stellar/stellar-sdk", () => ({
  Keypair: {
    fromPublicKey: jest.fn(),
  },
}));

describe("AuthService - Stellar Signature Verification", () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mock.jwt.token"),
    verify: jest.fn(),
  };

  const STELLAR_ADDRESS = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const VALID_MESSAGE = "StarPass authentication challenge for GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN at 1700000000000";
  const VALID_SIGNATURE = Buffer.alloc(64).toString("base64");

  const mockUser = {
    id: "user-123",
    stellarAddress: STELLAR_ADDRESS,
    role: "USER",
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe("login (signature verification)", () => {
    it("should return user session when Stellar signature is valid", async () => {
      const mockVerify = jest.fn().mockReturnValue(true);
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({
        verify: mockVerify,
      });

      mockPrismaService.user.upsert.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({
        id: "session-1",
        userId: mockUser.id,
        token: "refresh-token-hex",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await service.login(STELLAR_ADDRESS, VALID_SIGNATURE, VALID_MESSAGE);

      expect(StellarSdk.Keypair.fromPublicKey).toHaveBeenCalledWith(STELLAR_ADDRESS);
      expect(mockVerify).toHaveBeenCalled();
      expect(result).toHaveProperty("token", "mock.jwt.token");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
      expect(result.user.stellarAddress).toBe(STELLAR_ADDRESS);
    });

    it("should throw 401 when Stellar signature is invalid", async () => {
      const mockVerify = jest.fn().mockReturnValue(false);
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({
        verify: mockVerify,
      });

      await expect(
        service.login(STELLAR_ADDRESS, "invalidsignature", VALID_MESSAGE),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.upsert).not.toHaveBeenCalled();
    });

    it("should throw 401 when signature verification throws (expired nonce / malformed input)", async () => {
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid public key");
      });

      await expect(
        service.login(STELLAR_ADDRESS, VALID_SIGNATURE, VALID_MESSAGE),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.upsert).not.toHaveBeenCalled();
    });

    it("should throw 401 when an already-used nonce is detected via invalid signature", async () => {
      // Simulates replayed / already-used nonce: SDK returns false for a replayed message
      const mockVerify = jest.fn().mockReturnValue(false);
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({
        verify: mockVerify,
      });

      const replayedMessage = "StarPass authentication challenge for GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN at 1600000000000";

      await expect(
        service.login(STELLAR_ADDRESS, VALID_SIGNATURE, replayedMessage),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.user.upsert).not.toHaveBeenCalled();
    });
  });
});
