// ============================================================
// ChainPilot AI — Environment Configuration
// ============================================================

import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';

  // Blockchain — Alchemy
  ALCHEMY_API_KEY: string;
  ALCHEMY_RPC_URL: string;
  ALCHEMY_SEPOLIA_RPC_URL: string;

  // Blockchain — Etherscan
  ETHERSCAN_API_KEY: string;

  // Blockchain — Agent Wallet
  AGENT_PRIVATE_KEY: string;
  ACTIVE_NETWORK: 'mainnet' | 'sepolia';

  // AI — OpenAI
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;

  // Database — Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;

  // Optional
  COVALENT_API_KEY?: string;

  // Security
  TX_MAX_ETH_PER_TX: string;
  TX_MAX_ETH_PER_DAY: string;
  TX_CONFIRMATION_TIMEOUT_MINUTES: number;
}

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getEnvVarOptional(key: string): string | undefined {
  return process.env[key] || undefined;
}

function validatePrivateKey(key: string): void {
  const cleanKey = key.replace('0x', '');
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error('❌ AGENT_PRIVATE_KEY has invalid format (must be 64 hex characters)');
  }
}

export function loadConfig(): EnvConfig {
  const privateKey = getEnvVar('AGENT_PRIVATE_KEY');
  validatePrivateKey(privateKey);

  const alchemyKey = getEnvVar('ALCHEMY_API_KEY');

  const config: EnvConfig = {
    // Server
    PORT: parseInt(process.env.PORT || '4000', 10),
    NODE_ENV: (process.env.NODE_ENV || 'development') as EnvConfig['NODE_ENV'],

    // Blockchain — Alchemy
    ALCHEMY_API_KEY: alchemyKey,
    ALCHEMY_RPC_URL:
      process.env.ALCHEMY_RPC_URL ||
      `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    ALCHEMY_SEPOLIA_RPC_URL:
      process.env.ALCHEMY_SEPOLIA_RPC_URL ||
      `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,

    // Blockchain — Etherscan
    ETHERSCAN_API_KEY: getEnvVar('ETHERSCAN_API_KEY'),

    // Blockchain — Agent Wallet
    AGENT_PRIVATE_KEY: privateKey,
    ACTIVE_NETWORK: (process.env.ACTIVE_NETWORK || 'sepolia') as 'mainnet' | 'sepolia',

    // AI — OpenAI
    OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',

    // Database — Supabase
    SUPABASE_URL: getEnvVar('SUPABASE_URL'),
    SUPABASE_SERVICE_KEY: getEnvVar('SUPABASE_SERVICE_KEY'),

    // Optional
    COVALENT_API_KEY: getEnvVarOptional('COVALENT_API_KEY'),

    // Security
    TX_MAX_ETH_PER_TX: process.env.TX_MAX_ETH_PER_TX || '1.0',
    TX_MAX_ETH_PER_DAY: process.env.TX_MAX_ETH_PER_DAY || '5.0',
    TX_CONFIRMATION_TIMEOUT_MINUTES: parseInt(
      process.env.TX_CONFIRMATION_TIMEOUT_MINUTES || '15',
      10
    ),
  };

  return config;
}

// Export singleton config
let _config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export default getConfig;
