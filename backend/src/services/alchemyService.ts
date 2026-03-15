// ============================================================
// ChainPilot AI — Alchemy Service
// ============================================================
// Wraps Alchemy JSON-RPC and Enhanced API calls with ethers.js
//
// Functions:
//   getEthBalance(address)     → ETH balance as string
//   getTokenBalances(address)  → Array of token balances
//   getTokenMetadata(contract) → Token name, symbol, decimals
//   getNFTs(address)           → Array of NFT objects
//   getTransactionReceipt(hash)→ Full receipt with logs
//   getTransaction(hash)       → Transaction object
//   estimateGas(txParams)      → Gas estimate (bigint)
//   getGasPrice()              → Current gas price
// ============================================================

import { ethers } from 'ethers';

let _provider: ethers.JsonRpcProvider | null = null;
let _sepoliaProvider: ethers.JsonRpcProvider | null = null;

/**
 * Get the Alchemy-backed JSON-RPC provider for mainnet
 */
export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.ALCHEMY_RPC_URL;
    if (!rpcUrl) throw new Error('ALCHEMY_RPC_URL is not set');
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

/**
 * Get the Alchemy-backed JSON-RPC provider for Sepolia testnet
 */
export function getSepoliaProvider(): ethers.JsonRpcProvider {
  if (!_sepoliaProvider) {
    const rpcUrl = process.env.ALCHEMY_SEPOLIA_RPC_URL;
    if (!rpcUrl) throw new Error('ALCHEMY_SEPOLIA_RPC_URL is not set');
    _sepoliaProvider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _sepoliaProvider;
}

/**
 * Get the appropriate provider based on network config
 */
export function getActiveProvider(): ethers.JsonRpcProvider {
  const network = process.env.ACTIVE_NETWORK || 'sepolia';
  return network === 'mainnet' ? getProvider() : getSepoliaProvider();
}

/**
 * Get ETH balance for an address
 */
export async function getEthBalance(address: string): Promise<string> {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Get ERC-20 token balances using Alchemy Enhanced API
 */
export async function getTokenBalances(address: string): Promise<any[]> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error('ALCHEMY_API_KEY is not set');

  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getTokenBalances',
      params: [address],
    }),
  });

  const data: any = await response.json();

  if (data.error) {
    throw new Error(`Alchemy error: ${data.error.message}`);
  }

  // Filter out zero balances
  const tokenBalances = (data.result?.tokenBalances || []).filter(
    (t: any) => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  return tokenBalances;
}

/**
 * Get token metadata (name, symbol, decimals) from contract
 */
export async function getTokenMetadata(contractAddress: string): Promise<{
  name: string;
  symbol: string;
  decimals: number;
}> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error('ALCHEMY_API_KEY is not set');

  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getTokenMetadata',
      params: [contractAddress],
    }),
  });

  const data: any = await response.json();

  if (data.error) {
    throw new Error(`Alchemy token metadata error: ${data.error.message}`);
  }

  return {
    name: data.result?.name || 'Unknown',
    symbol: data.result?.symbol || 'UNKNOWN',
    decimals: data.result?.decimals || 18,
  };
}

/**
 * Get NFTs owned by an address
 */
export async function getNFTs(address: string): Promise<any[]> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error('ALCHEMY_API_KEY is not set');

  const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=20`;

  const response = await fetch(url);
  const data: any = await response.json();

  return (data.ownedNfts || []).map((nft: any) => ({
    name: nft.name || nft.title || 'Unnamed NFT',
    collection: nft.contract?.name || 'Unknown Collection',
    tokenId: nft.tokenId,
    contractAddress: nft.contract?.address,
    imageUrl: nft.image?.cachedUrl || nft.image?.originalUrl || null,
  }));
}

/**
 * Get full transaction receipt
 */
export async function getTransactionReceipt(hash: string): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider();
  return provider.getTransactionReceipt(hash);
}

/**
 * Get transaction details
 */
export async function getTransaction(hash: string): Promise<ethers.TransactionResponse | null> {
  const provider = getProvider();
  return provider.getTransaction(hash);
}

/**
 * Get block details
 */
export async function getBlock(blockNumber: number): Promise<ethers.Block | null> {
  const provider = getProvider();
  return provider.getBlock(blockNumber);
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(txParams: ethers.TransactionRequest): Promise<bigint> {
  const provider = getActiveProvider();
  return provider.estimateGas(txParams);
}

/**
 * Get current fee data (EIP-1559)
 */
export async function getFeeData(): Promise<ethers.FeeData> {
  const provider = getActiveProvider();
  return provider.getFeeData();
}
