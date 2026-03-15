// ============================================================
// ChainPilot AI — Tool: Transaction Executor
// ============================================================
// Constructs, previews, and executes blockchain transactions.
// CRITICAL: Never executes without confirmed=true.
//
// sendETH(to, amount, confirmed?) → preview or tx result
// transferERC20(token, to, amount, confirmed?) → preview or tx result
// ============================================================

import { ethers } from 'ethers';
import * as alchemyService from '../services/alchemyService';
import * as etherscanService from '../services/etherscanService';
import { resolveAddressOrEns } from './ensResolver';
import { TransactionPreview, TransactionResult } from '../types';

// ERC-20 minimal ABI for transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

/**
 * Get the agent's wallet for signing transactions
 */
function getAgentWallet(): ethers.Wallet {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) throw new Error('AGENT_PRIVATE_KEY is not set');

  const network = process.env.ACTIVE_NETWORK || 'sepolia';
  const provider =
    network === 'mainnet'
      ? alchemyService.getProvider()
      : alchemyService.getSepoliaProvider();

  return new ethers.Wallet(privateKey, provider);
}

/**
 * Get the explorer URL for a transaction hash
 */
function getExplorerUrl(txHash: string): string {
  const network = process.env.ACTIVE_NETWORK || 'sepolia';
  const base =
    network === 'mainnet'
      ? 'https://etherscan.io'
      : 'https://sepolia.etherscan.io';
  return `${base}/tx/${txHash}`;
}

/**
 * Check transaction limits
 */
function checkLimits(amountEth: number): void {
  const maxPerTx = parseFloat(process.env.TX_MAX_ETH_PER_TX || '1.0');

  if (amountEth > maxPerTx) {
    throw new Error(
      `Amount ${amountEth} ETH exceeds per-transaction limit of ${maxPerTx} ETH`
    );
  }

  if (amountEth <= 0) {
    throw new Error('Amount must be greater than 0');
  }
}

// ============================================================
// SEND ETH
// ============================================================

/**
 * Send ETH to an address
 *
 * When confirmed=false (default): returns a preview with gas estimate
 * When confirmed=true: broadcasts the transaction
 */
export async function sendETH(
  to: string,
  amount: string,
  confirmed: boolean = false
): Promise<TransactionPreview | TransactionResult> {
  // Resolve ENS or validate address
  const resolved = await resolveAddressOrEns(to);
  const receiverAddress = resolved.address;

  // Validate amount
  const amountFloat = parseFloat(amount);
  if (isNaN(amountFloat)) throw new Error(`Invalid amount: ${amount}`);
  checkLimits(amountFloat);

  const wallet = getAgentWallet();
  const value = ethers.parseEther(amount);

  // Check balance
  const balance = await wallet.provider!.getBalance(wallet.address);
  if (balance < value) {
    const balanceEth = ethers.formatEther(balance);
    throw new Error(
      `Insufficient balance: wallet has ${parseFloat(balanceEth).toFixed(4)} ETH, ` +
      `but ${amount} ETH is required (plus gas)`
    );
  }

  // Estimate gas
  const gasEstimate = await wallet.provider!.estimateGas({
    to: receiverAddress,
    value,
    from: wallet.address,
  });
  const feeData = await wallet.provider!.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || 0n;
  const estimatedGasWei = gasEstimate * maxFeePerGas;
  const estimatedGasEth = ethers.formatEther(estimatedGasWei);
  const ethPrice = await etherscanService.getEthPrice();
  const estimatedGasUsd = parseFloat(estimatedGasEth) * ethPrice;

  // If not confirmed, return preview
  if (!confirmed) {
    const network = process.env.ACTIVE_NETWORK || 'sepolia';

    const preview: TransactionPreview = {
      pendingTxId: '', // Will be set by the route handler
      type: 'send_eth',
      to: receiverAddress,
      toEns: resolved.ensName,
      token: 'ETH',
      amount,
      estimatedGas: parseFloat(estimatedGasEth).toFixed(6),
      estimatedGasUsd: Math.round(estimatedGasUsd * 100) / 100,
      network,
      requiresConfirmation: true,
    };

    return preview;
  }

  // ===== EXECUTE TRANSACTION =====
  const tx = await wallet.sendTransaction({
    to: receiverAddress,
    value,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    gasLimit: (gasEstimate * 120n) / 100n, // 20% buffer
    type: 2, // EIP-1559
  });

  // Wait for confirmation
  const receipt = await tx.wait();

  if (!receipt) throw new Error('Transaction failed — no receipt received');

  const result: TransactionResult = {
    txHash: receipt.hash,
    explorerUrl: getExplorerUrl(receipt.hash),
    status: receipt.status === 1 ? 'mined' : 'failed',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };

  return result;
}

// ============================================================
// TRANSFER ERC-20
// ============================================================

/**
 * Transfer ERC-20 tokens to an address
 *
 * When confirmed=false: returns preview
 * When confirmed=true: broadcasts the transaction
 */
export async function transferERC20(
  tokenAddress: string,
  to: string,
  amount: string,
  confirmed: boolean = false
): Promise<TransactionPreview | TransactionResult> {
  // Validate token address
  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }

  // Resolve receiver
  const resolved = await resolveAddressOrEns(to);
  const receiverAddress = resolved.address;

  const wallet = getAgentWallet();
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  // Get token metadata
  const [decimals, symbol, name] = await Promise.all([
    contract.decimals() as Promise<number>,
    contract.symbol() as Promise<string>,
    contract.name() as Promise<string>,
  ]);

  // Parse amount
  const amountFloat = parseFloat(amount);
  if (isNaN(amountFloat) || amountFloat <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const parsedAmount = ethers.parseUnits(amount, decimals);

  // Check token balance
  const tokenBalance: bigint = await contract.balanceOf(wallet.address);
  if (tokenBalance < parsedAmount) {
    const formattedBalance = ethers.formatUnits(tokenBalance, decimals);
    throw new Error(
      `Insufficient ${symbol} balance: wallet has ${parseFloat(formattedBalance).toFixed(4)}, ` +
      `but ${amount} is required`
    );
  }

  // Estimate gas
  const gasEstimate = await contract.transfer.estimateGas(receiverAddress, parsedAmount);
  const feeData = await wallet.provider!.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || 0n;
  const estimatedGasWei = gasEstimate * maxFeePerGas;
  const estimatedGasEth = ethers.formatEther(estimatedGasWei);
  const ethPrice = await etherscanService.getEthPrice();
  const estimatedGasUsd = parseFloat(estimatedGasEth) * ethPrice;

  // If not confirmed, return preview
  if (!confirmed) {
    const network = process.env.ACTIVE_NETWORK || 'sepolia';

    const preview: TransactionPreview = {
      pendingTxId: '',
      type: 'transfer_erc20',
      to: receiverAddress,
      toEns: resolved.ensName,
      token: `${symbol} (${name})`,
      amount,
      estimatedGas: parseFloat(estimatedGasEth).toFixed(6),
      estimatedGasUsd: Math.round(estimatedGasUsd * 100) / 100,
      network,
      requiresConfirmation: true,
    };

    return preview;
  }

  // ===== EXECUTE TRANSACTION =====
  const tx = await contract.transfer(receiverAddress, parsedAmount);
  const receipt = await tx.wait();

  if (!receipt) throw new Error('Transaction failed — no receipt received');

  const result: TransactionResult = {
    txHash: receipt.hash,
    explorerUrl: getExplorerUrl(receipt.hash),
    status: receipt.status === 1 ? 'mined' : 'failed',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };

  return result;
}
