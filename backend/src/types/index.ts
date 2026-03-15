// ============================================================
// ChainPilot AI — Shared Type Definitions
// ============================================================

// ── Wallet Types ──

export interface WalletInfo {
  address: string;
  ensName: string | null;
  ethBalance: string;
  ethBalanceUsd: number;
  tokens: TokenBalance[];
  nfts: NFTItem[];
  transactionCount: number;
  recentTransactions: TransactionSummary[];
  defiProtocols: string[];
  behaviorProfile: BehaviorProfile;
  riskLevel: RiskLevel;
}

export interface TokenBalance {
  contractAddress: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  usdValue: number;
}

export interface NFTItem {
  name: string;
  collection: string;
  tokenId: string;
  contractAddress: string;
  imageUrl: string | null;
}

export type BehaviorProfile =
  | 'Whale'
  | 'DeFi Trader'
  | 'NFT Collector'
  | 'Retail User'
  | 'Inactive Wallet';

// ── Transaction Types ──

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  gasUsed: string;
  gasCostEth: string;
  gasCostUsd: number;
  status: 'success' | 'failed';
  tokenTransfers: TokenTransfer[];
  contractInteracted: string | null;
  protocol: string | null;
  methodName: string | null;
  summary: string;
  timestamp: string;
}

export interface TransactionSummary {
  hash: string;
  type: string;
  protocol: string | null;
  value: string;
  timestamp: string;
}

export interface TokenTransfer {
  token: string;
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
  decimals: number;
}

// ── Token Risk Types ──

export interface TokenRiskInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  riskScore: number; // 1-10
  risks: RiskItem[];
  holderCount: number;
  topHolders: HolderInfo[];
  liquidityLocked: boolean;
  hasMintFunction: boolean;
  hasBlacklist: boolean;
  isHoneypot: boolean;
  recommendation: 'SAFE' | 'CAUTION' | 'AVOID';
}

export interface RiskItem {
  category: 'ownership' | 'concentration' | 'liquidity' | 'function' | 'honeypot';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface HolderInfo {
  address: string;
  percentage: number;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

// ── Contract Types ──

export interface ContractInfo {
  address: string;
  name: string;
  sourceCode: string;
  abi: string;
  compiler: string;
  isVerified: boolean;
}

// ── Whale Types ──

export interface WhaleMovement {
  walletAddress: string;
  walletLabel: string | null;
  type: 'buy' | 'sell' | 'transfer';
  token: string;
  amount: string;
  usdValue: number;
  protocol: string | null;
  txHash: string;
  timestamp: string;
}

// ── DeFi Types ──

export interface YieldOpportunity {
  protocol: string;
  pool: string;
  token: string;
  apy: number;
  apyBase: number;
  apyReward: number;
  tvl: number;
  chain: string;
  riskLevel: RiskLevel;
  description: string;
}

// ── Transaction Execution Types ──

export interface TransactionPreview {
  pendingTxId: string;
  type: 'send_eth' | 'transfer_erc20' | 'swap';
  to: string;
  toEns: string | null;
  token: string;
  amount: string;
  estimatedGas: string;
  estimatedGasUsd: number;
  network: string;
  requiresConfirmation: true;
}

export interface TransactionResult {
  txHash: string;
  explorerUrl: string;
  status: 'broadcast' | 'mined' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
}

export interface PendingTransaction {
  id: string;
  conversationId: string;
  userId: string;
  txType: string;
  txParams: Record<string, any>;
  estimatedGas: string | null;
  status: PendingTxStatus;
  txHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  confirmedAt: string | null;
  broadcastAt: string | null;
}

export type PendingTxStatus =
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'broadcast'
  | 'mined'
  | 'failed';

// ── Intent Detection Types ──

export interface IntentResult {
  intent: IntentType;
  params: Record<string, string>;
  confidence: number;
}

export type IntentType =
  | 'wallet_analysis'
  | 'transaction_explanation'
  | 'token_analysis'
  | 'contract_explanation'
  | 'whale_tracking'
  | 'defi_strategy'
  | 'send_eth'
  | 'transfer_token'
  | 'swap_tokens'
  | 'portfolio_analysis'
  | 'general_question';

// ── Chat Types ──

export interface ChatRequest {
  message: string;
  conversationId?: string;
  walletAddress?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── SSE Stream Types ──

export type StreamEventType =
  | 'text'
  | 'structured'
  | 'confirmation'
  | 'tool_call'
  | 'error'
  | 'done';

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  component?: string;
  data?: Record<string, any>;
  conversationId?: string;
  txId?: string;
}

// ── API Error Types ──

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type ErrorCode =
  | 'INVALID_ADDRESS'
  | 'INVALID_TX_HASH'
  | 'MISSING_FIELD'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'EXTERNAL_API_ERROR'
  | 'AGENT_ERROR'
  | 'TX_ALREADY_CONFIRMED'
  | 'TX_EXPIRED'
  | 'INTERNAL_ERROR';
