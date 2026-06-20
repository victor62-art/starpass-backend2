import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    mockSendMail = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FROM_EMAIL') return 'test@starpass.com';
              return 'test_value';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email with correct parameters', async () => {
    mockSendMail.mockResolvedValueOnce(true);

    await service.sendPassPurchaseEmail(
      'creator@example.com',
      'GB...FAN',
      'Gold Tier',
      100
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'test@starpass.com',
      to: 'creator@example.com',
      subject: 'New Pass Purchase - StarPass',
      html: expect.stringContaining('GB...FAN'),
    });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Gold Tier'),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('100 USDC'),
      })
    );
  });

  it('should handle SMTP failures gracefully', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

    // Should not throw
    await expect(
      service.sendPassPurchaseEmail('creator@example.com', 'GB...FAN', 'Gold Tier', 100)
    ).resolves.not.toThrow();

    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
