// ============================================================
// ChainPilot AI — Tool: Wallet Analyzer
// ============================================================
// Fetches comprehensive wallet data and generates a profile.
//
// get_wallet_info(address) → WalletInfo
// ============================================================

import { ethers } from 'ethers';
import * as alchemyService from '../services/alchemyService';
import * as etherscanService from '../services/etherscanService';
import * as defiLlamaService from '../services/defiLlamaService';
import {
  WalletInfo,
  TokenBalance,
  NFTItem,
  TransactionSummary,
  BehaviorProfile,
  RiskLevel,
} from '../types';

// Known DeFi protocol contract addresses (partial list for identification)
const DEFI_PROTOCOLS: Record<string, string> = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3',
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': 'Uniswap Universal Router',
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2',
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3',
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'Lido',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch',
  '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7': 'Curve',
};

/**
 * Get comprehensive wallet information
 */
export async function getWalletInfo(address: string): Promise<WalletInfo> {
  // Resolve ENS name if provided
  let resolvedAddress = address;
  let ensName: string | null = null;

  if (address.endsWith('.eth')) {
    const provider = alchemyService.getProvider();
    const resolved = await provider.resolveName(address);
    if (!resolved) throw new Error(`Could not resolve ENS name: ${address}`);
    resolvedAddress = resolved;
    ensName = address;
  } else {
    // Try reverse ENS lookup
    try {
      const provider = alchemyService.getProvider();
      ensName = await provider.lookupAddress(resolvedAddress);
    } catch {
      // Ignore reverse lookup failures
    }
  }

  // Validate address
  if (!ethers.isAddress(resolvedAddress)) {
    throw new Error(`Invalid Ethereum address: ${resolvedAddress}`);
  }

  // Fetch data in parallel
  const [
    ethBalance,
    rawTokenBalances,
    nfts,
    txList,
    ethPrice,
  ] = await Promise.all([
    alchemyService.getEthBalance(resolvedAddress),
    alchemyService.getTokenBalances(resolvedAddress),
    alchemyService.getNFTs(resolvedAddress),
    etherscanService.getTransactionList(resolvedAddress, 1, 50),
    etherscanService.getEthPrice(),
  ]);

  // Enrich token balances with metadata and prices
  const tokens: TokenBalance[] = [];
  for (const raw of rawTokenBalances.slice(0, 20)) {
    // Limit to 20 tokens
    try {
      const metadata = await alchemyService.getTokenMetadata(raw.contractAddress);
      const rawBalance = BigInt(raw.tokenBalance);
      const balance = ethers.formatUnits(rawBalance, metadata.decimals);
      const floatBalance = parseFloat(balance);

      // Skip dust amounts
      if (floatBalance < 0.001) continue;

      // Get USD price
      let usdValue = 0;
      try {
        const price = await defiLlamaService.getTokenPrice(raw.contractAddress);
        usdValue = floatBalance * price;
      } catch {
        // Price not available
      }

      tokens.push({
        contractAddress: raw.contractAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        balance: floatBalance.toFixed(4),
        decimals: metadata.decimals,
        usdValue: Math.round(usdValue * 100) / 100,
      });
    } catch {
      // Skip tokens that fail to load
    }
  }

  // Sort tokens by USD value
  tokens.sort((a, b) => b.usdValue - a.usdValue);

  // Process NFTs
  const nftItems: NFTItem[] = nfts.slice(0, 10).map((nft: any) => ({
    name: nft.name,
    collection: nft.collection,
    tokenId: nft.tokenId,
    contractAddress: nft.contractAddress,
    imageUrl: nft.imageUrl,
  }));

  // Process transactions
  const recentTransactions: TransactionSummary[] = txList.slice(0, 10).map((tx: any) => {
    const toAddress = (tx.to || '').toLowerCase();
    const protocol = DEFI_PROTOCOLS[toAddress] || null;
    const valueEth = ethers.formatEther(tx.value || '0');
    const type = tx.to === '' || !tx.to
      ? 'contract_creation'
      : tx.input === '0x'
        ? 'transfer'
        : 'contract_interaction';

    return {
      hash: tx.hash,
      type,
      protocol,
      value: `${parseFloat(valueEth).toFixed(4)} ETH`,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
    };
  });

  // Identify DeFi protocols used
  const protocolsUsed = new Set<string>();
  for (const tx of txList) {
    const toAddr = (tx.to || '').toLowerCase();
    if (DEFI_PROTOCOLS[toAddr]) {
      protocolsUsed.add(DEFI_PROTOCOLS[toAddr]);
    }
  }

  // Classify behavior
  const ethBalanceFloat = parseFloat(ethBalance);
  const totalTokenUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);
  const totalValueUsd = ethBalanceFloat * ethPrice + totalTokenUsd;
  const behaviorProfile = classifyBehavior(
    totalValueUsd,
    txList.length,
    nftItems.length,
    protocolsUsed.size
  );

  // Assess risk level
  const riskLevel = assessRiskLevel(txList.length, protocolsUsed.size);

  return {
    address: resolvedAddress,
    ensName,
    ethBalance: parseFloat(ethBalance).toFixed(4),
    ethBalanceUsd: Math.round(ethBalanceFloat * ethPrice * 100) / 100,
    tokens,
    nfts: nftItems,
    transactionCount: txList.length,
    recentTransactions,
    defiProtocols: Array.from(protocolsUsed),
    behaviorProfile,
    riskLevel,
  };
}

/**
 * Classify wallet behavior based on activity patterns
 */
function classifyBehavior(
  totalValueUsd: number,
  txCount: number,
  nftCount: number,
  defiProtocolCount: number
): BehaviorProfile {
  if (totalValueUsd > 1_000_000) return 'Whale';
  if (defiProtocolCount >= 3 && txCount > 20) return 'DeFi Trader';
  if (nftCount >= 5) return 'NFT Collector';
  if (txCount < 5) return 'Inactive Wallet';
  return 'Retail User';
}

/**
 * Assess overall wallet risk level
 */
function assessRiskLevel(txCount: number, defiProtocolCount: number): RiskLevel {
  if (defiProtocolCount >= 5 && txCount > 100) return 'High';
  if (defiProtocolCount >= 2 || txCount > 30) return 'Medium';
  return 'Low';
}
