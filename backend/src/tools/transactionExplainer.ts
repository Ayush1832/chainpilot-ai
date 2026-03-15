// ============================================================
// ChainPilot AI — Tool: Transaction Explainer
// ============================================================
// Fetches and explains a blockchain transaction in human language.
//
// getTransaction(txHash) → TransactionInfo
// ============================================================

import { ethers } from 'ethers';
import * as alchemyService from '../services/alchemyService';
import * as etherscanService from '../services/etherscanService';
import { TransactionInfo, TokenTransfer } from '../types';

// Known protocol router addresses
const PROTOCOL_ADDRESSES: Record<string, string> = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router 2',
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': 'Uniswap Universal Router',
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2 Lending Pool',
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3 Pool',
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'Lido stETH',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router',
  '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7': 'Curve 3pool',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC Contract',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT Contract',
};

// ERC-20 Transfer event signature
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

/**
 * Get detailed transaction information and generate a summary
 */
export async function getTransactionInfo(txHash: string): Promise<TransactionInfo> {
  // Validate hash format
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error(`Invalid transaction hash format: ${txHash}`);
  }

  // Fetch tx data and receipt in parallel
  const [tx, receipt, ethPrice] = await Promise.all([
    alchemyService.getTransaction(txHash),
    alchemyService.getTransactionReceipt(txHash),
    etherscanService.getEthPrice(),
  ]);

  if (!tx) throw new Error(`Transaction not found: ${txHash}`);
  if (!receipt) throw new Error(`Transaction receipt not found: ${txHash}`);

  // Get block for timestamp
  const block = await alchemyService.getBlock(receipt.blockNumber);
  const timestamp = block
    ? new Date(block.timestamp * 1000).toISOString()
    : new Date().toISOString();

  // Calculate gas cost
  const gasUsed = receipt.gasUsed.toString();
  const gasPrice = receipt.gasPrice || tx.gasPrice || 0n;
  const gasCostWei = receipt.gasUsed * gasPrice;
  const gasCostEth = ethers.formatEther(gasCostWei);
  const gasCostUsd = parseFloat(gasCostEth) * ethPrice;

  // Parse token transfers from logs
  const tokenTransfers = await parseTokenTransfers(receipt, tx.from);

  // Identify protocol
  const toAddress = (tx.to || '').toLowerCase();
  const protocol = PROTOCOL_ADDRESSES[toAddress] || null;

  // Determine method name from function selector
  let methodName: string | null = null;
  if (tx.data && tx.data.length >= 10) {
    const selector = tx.data.slice(0, 10);
    methodName = identifyMethod(selector);
  }

  // Generate summary
  const summary = generateSummary(
    tx,
    tokenTransfers,
    protocol,
    methodName,
    gasCostEth,
    gasCostUsd
  );

  return {
    hash: txHash,
    blockNumber: receipt.blockNumber,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value),
    gasUsed,
    gasCostEth: parseFloat(gasCostEth).toFixed(6),
    gasCostUsd: Math.round(gasCostUsd * 100) / 100,
    status: receipt.status === 1 ? 'success' : 'failed',
    tokenTransfers,
    contractInteracted: tx.to,
    protocol,
    methodName,
    summary,
    timestamp,
  };
}

/**
 * Parse ERC-20 Transfer events from transaction logs
 */
async function parseTokenTransfers(
  receipt: ethers.TransactionReceipt,
  fromAddress: string
): Promise<TokenTransfer[]> {
  const transfers: TokenTransfer[] = [];

  for (const log of receipt.logs) {
    // Check if it's a Transfer event
    if (log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;

    try {
      const from = ethers.getAddress('0x' + log.topics[1].slice(26));
      const to = ethers.getAddress('0x' + log.topics[2].slice(26));
      const amount = BigInt(log.data);

      // Get token metadata
      let symbol = 'UNKNOWN';
      let decimals = 18;
      try {
        const metadata = await alchemyService.getTokenMetadata(log.address);
        symbol = metadata.symbol;
        decimals = metadata.decimals;
      } catch {
        // Fallback
      }

      const formattedAmount = ethers.formatUnits(amount, decimals);

      transfers.push({
        token: symbol,
        tokenAddress: log.address,
        from,
        to,
        amount: parseFloat(formattedAmount).toFixed(4),
        decimals,
      });
    } catch {
      // Skip unparseable logs
    }
  }

  return transfers;
}

/**
 * Identify common method names from function selectors
 */
function identifyMethod(selector: string): string | null {
  const methods: Record<string, string> = {
    '0xa9059cbb': 'transfer',
    '0x23b872dd': 'transferFrom',
    '0x095ea7b3': 'approve',
    '0x38ed1739': 'swapExactTokensForTokens',
    '0x7ff36ab5': 'swapExactETHForTokens',
    '0x18cbafe5': 'swapExactTokensForETH',
    '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    '0xfb3bdb41': 'swapETHForExactTokens',
    '0x414bf389': 'exactInputSingle',
    '0xc04b8d59': 'exactInput',
    '0xdb3e2198': 'exactOutputSingle',
    '0xe449022e': 'uniswapV3Swap',
    '0x3593564c': 'execute', // Universal Router
    '0xa0712d68': 'mint',
    '0x1249c58b': 'mint',
    '0x40c10f19': 'mint',
    '0xe8e33700': 'addLiquidity',
    '0xf305d719': 'addLiquidityETH',
    '0xbaa2abde': 'removeLiquidity',
    '0x02751cec': 'removeLiquidityETH',
    '0xe9e05c42': 'depositTransaction',
    '0xd0e30db0': 'deposit',
    '0x2e1a7d4d': 'withdraw',
    '0xa694fc3a': 'stake',
    '0x2e17de78': 'unstake',
  };

  return methods[selector.toLowerCase()] || null;
}

/**
 * Generate a human-readable summary of the transaction
 */
function generateSummary(
  tx: ethers.TransactionResponse,
  tokenTransfers: TokenTransfer[],
  protocol: string | null,
  methodName: string | null,
  gasCostEth: string,
  gasCostUsd: number
): string {
  const ethValue = parseFloat(ethers.formatEther(tx.value));
  const parts: string[] = [];

  // Determine transaction type
  if (tokenTransfers.length >= 2) {
    // Likely a swap — find tokens going in and out
    const tokensOut = tokenTransfers.filter(
      (t) => t.from.toLowerCase() === tx.from.toLowerCase()
    );
    const tokensIn = tokenTransfers.filter(
      (t) => t.to.toLowerCase() === tx.from.toLowerCase()
    );

    if (tokensOut.length > 0 && tokensIn.length > 0) {
      const outToken = tokensOut[0];
      const inToken = tokensIn[tokensIn.length - 1];
      parts.push(
        `Swapped ${outToken.amount} ${outToken.token} for ${inToken.amount} ${inToken.token}`
      );
    } else {
      parts.push(`${tokenTransfers.length} token transfers detected`);
    }
  } else if (tokenTransfers.length === 1) {
    const transfer = tokenTransfers[0];
    parts.push(
      `Transferred ${transfer.amount} ${transfer.token} to ${transfer.to.slice(0, 10)}...`
    );
  } else if (ethValue > 0) {
    parts.push(
      `Sent ${ethValue.toFixed(4)} ETH to ${(tx.to || '').slice(0, 10)}...`
    );
  } else if (methodName) {
    parts.push(`Called ${methodName}()`);
  } else {
    parts.push('Contract interaction');
  }

  if (protocol) {
    parts.push(`on ${protocol}`);
  }

  parts.push(`| Gas: ${parseFloat(gasCostEth).toFixed(4)} ETH ($${gasCostUsd.toFixed(2)})`);

  return parts.join(' ');
}
