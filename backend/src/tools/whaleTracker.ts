// ============================================================
// ChainPilot AI — Tool: Whale Activity Tracker
// ============================================================
// Monitors known whale wallets for large transactions.
//
// getWhaleActivity(address?) → WhaleMovement[]
// ============================================================

import { ethers } from 'ethers';
import * as etherscanService from '../services/etherscanService';
import * as supabaseService from '../services/supabaseService';
import { WhaleMovement } from '../types';

// Default well-known whale addresses
const DEFAULT_WHALES: { address: string; label: string }[] = [
  { address: '0x28c6c06298d514db089934071355e5743bf21d60', label: 'Binance Hot Wallet' },
  { address: '0x21a31ee1afc51d94c2efccaa2092ad1028285549', label: 'Binance Wallet' },
  { address: '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', label: 'Binance Wallet 2' },
  { address: '0x56eddb7aa87536c09ccc2793473599fd21a8b17f', label: 'Binance Cold Wallet' },
  { address: '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503', label: 'Binance Deposit' },
  { address: '0x8894e0a0c962cb723c1ef8c2c8e4e15bc8d1b79e', label: 'Coinbase' },
  { address: '0xa090e606e30bd747d4e6245a1517ebe430f0057e', label: 'Coinbase Prime' },
  { address: '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0', label: 'Kraken' },
  { address: '0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2', label: 'FTX (Legacy)' },
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik.eth' },
  { address: '0x00000000219ab540356cbb839cbe05303d7705fa', label: 'ETH2 Deposit Contract' },
  { address: '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', label: 'Binance Cold Storage' },
];

// Minimum ETH value to consider a "whale" transaction
const WHALE_THRESHOLD_ETH = 100; // 100 ETH

/**
 * Get recent whale activity — either for a specific address or all known whales
 */
export async function getWhaleActivity(
  address?: string
): Promise<WhaleMovement[]> {
  const movements: WhaleMovement[] = [];

  if (address) {
    // Track specific whale
    const txs = await getWhaleTransactions(address, 'Tracked Wallet');
    movements.push(...txs);
  } else {
    // Check all known whales (from DB + defaults)
    let whaleList = [...DEFAULT_WHALES];

    try {
      const dbWhales = await supabaseService.getWhaleWatchlist();
      for (const whale of dbWhales) {
        if (!whaleList.find((w) => w.address.toLowerCase() === whale.address.toLowerCase())) {
          whaleList.push({ address: whale.address, label: whale.label || 'Tracked Whale' });
        }
      }
    } catch {
      // DB not available, use defaults
    }

    // Only check first 5 whales to stay within rate limits
    const whalesSample = whaleList.slice(0, 5);

    for (const whale of whalesSample) {
      try {
        const txs = await getWhaleTransactions(whale.address, whale.label);
        movements.push(...txs);
      } catch {
        // Skip whales that fail
      }
    }
  }

  // Sort by timestamp (most recent first)
  movements.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return movements.slice(0, 20); // Return top 20
}

/**
 * Get large transactions for a specific whale address
 */
async function getWhaleTransactions(
  address: string,
  label: string
): Promise<WhaleMovement[]> {
  const movements: WhaleMovement[] = [];

  // Get recent normal transactions
  const txList = await etherscanService.getTransactionList(address, 1, 10);

  for (const tx of txList) {
    const valueEth = parseFloat(ethers.formatEther(tx.value || '0'));

    // Only report large transactions
    if (valueEth < WHALE_THRESHOLD_ETH) continue;

    const isSending = tx.from.toLowerCase() === address.toLowerCase();
    const type = isSending ? 'sell' : 'buy';

    movements.push({
      walletAddress: address,
      walletLabel: label,
      type: type as 'buy' | 'sell' | 'transfer',
      token: 'ETH',
      amount: valueEth.toFixed(2),
      usdValue: 0, // Would need price lookup
      protocol: null,
      txHash: tx.hash,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
    });
  }

  // Get recent token transfers
  const tokenTxs = await etherscanService.getTokenTransfers(address, 1, 10);

  for (const tx of tokenTxs) {
    const decimals = parseInt(tx.tokenDecimal || '18');
    const value = parseFloat(tx.value || '0') / Math.pow(10, decimals);

    // Whale threshold for stablecoins (100K USD equivalent)
    const isStable = ['USDC', 'USDT', 'DAI', 'BUSD'].includes(tx.tokenSymbol);
    const threshold = isStable ? 100000 : WHALE_THRESHOLD_ETH;

    if (value < threshold) continue;

    const isSending = tx.from.toLowerCase() === address.toLowerCase();

    movements.push({
      walletAddress: address,
      walletLabel: label,
      type: isSending ? 'sell' : 'buy',
      token: tx.tokenSymbol || 'UNKNOWN',
      amount: value.toFixed(2),
      usdValue: isStable ? value : 0,
      protocol: null,
      txHash: tx.hash,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
    });
  }

  return movements;
}
