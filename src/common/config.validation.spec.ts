import { validateConfig } from './config.validation';

describe('validateConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should not throw if all required env vars are present', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432';
    process.env.JWT_SECRET = 'secret';
    process.env.STELLAR_RPC_URL = 'http://localhost:8000';
    process.env.STELLAR_NETWORK = 'testnet';
    process.env.STARPASS_CONTRACT_ID = 'CC123';

    expect(() => validateConfig()).not.toThrow();
  });

  it('should throw a descriptive error if one required env var is missing', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432';
    // JWT_SECRET is missing
    process.env.STELLAR_RPC_URL = 'http://localhost:8000';
    process.env.STELLAR_NETWORK = 'testnet';
    process.env.STARPASS_CONTRACT_ID = 'CC123';

    expect(() => validateConfig()).toThrow(
      'Missing required environment variables: JWT_SECRET',
    );
  });

  it('should throw a descriptive error listing multiple missing env vars', () => {
    // DATABASE_URL is missing
    // JWT_SECRET is missing
    process.env.STELLAR_RPC_URL = 'http://localhost:8000';
    process.env.STELLAR_NETWORK = 'testnet';
    // STARPASS_CONTRACT_ID is missing

    expect(() => validateConfig()).toThrow(
      'Missing required environment variables: DATABASE_URL, JWT_SECRET, STARPASS_CONTRACT_ID',
    );
  });

  it('should throw if a required env var is an empty string or whitespace', () => {
    process.env.DATABASE_URL = ' ';
    process.env.JWT_SECRET = 'secret';
    process.env.STELLAR_RPC_URL = 'http://localhost:8000';
    process.env.STELLAR_NETWORK = 'testnet';
    process.env.STARPASS_CONTRACT_ID = 'CC123';

    expect(() => validateConfig()).toThrow(
      'Missing required environment variables: DATABASE_URL',
    );
  });
});
