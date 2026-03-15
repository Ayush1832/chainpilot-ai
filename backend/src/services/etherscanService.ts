// ============================================================
// ChainPilot AI — Etherscan Service
// ============================================================
// Wraps Etherscan REST API calls with rate-limited request queue.
// Rate limit: 5 calls/sec (200ms between calls)
//
// Functions:
//   getTransactionList(address)   → Array of tx objects
//   getTokenTransfers(address)    → Array of ERC-20 transfers
//   getInternalTxs(address)       → Array of internal txs
//   getContractSource(address)    → Source code + ABI
//   getContractABI(address)       → ABI JSON string
//   getERC20TransfersByTx(hash)   → Token transfers in a tx
// ============================================================

const BASE_URL = 'https://api.etherscan.io/api';

interface QueueItem {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  params: Record<string, string>;
}

class EtherscanRateLimiter {
  private queue: QueueItem[] = [];
  private processing = false;
  private lastCallTime = 0;
  private MIN_INTERVAL = 210; // ms (~5 calls/sec with buffer)

  async request(params: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, params });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // Enforce rate limit
      const elapsed = Date.now() - this.lastCallTime;
      if (elapsed < this.MIN_INTERVAL) {
        await new Promise((r) => setTimeout(r, this.MIN_INTERVAL - elapsed));
      }

      this.lastCallTime = Date.now();

      try {
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) throw new Error('ETHERSCAN_API_KEY is not set');

        const queryParams = new URLSearchParams({ ...item.params, apikey: apiKey });
        const url = `${BASE_URL}?${queryParams.toString()}`;

        const response = await fetch(url);
        const data: any = await response.json();

        if (data.status === '0' && data.message === 'NOTOK') {
          throw new Error(`Etherscan error: ${data.result}`);
        }

        item.resolve(data.result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }
}

const rateLimiter = new EtherscanRateLimiter();

/**
 * Get list of normal transactions for an address
 */
export async function getTransactionList(
  address: string,
  page: number = 1,
  offset: number = 20,
  sort: 'asc' | 'desc' = 'desc'
): Promise<any[]> {
  const result = await rateLimiter.request({
    module: 'account',
    action: 'txlist',
    address,
    startblock: '0',
    endblock: '99999999',
    page: String(page),
    offset: String(offset),
    sort,
  });

  return Array.isArray(result) ? result : [];
}

/**
 * Get ERC-20 token transfer events for an address
 */
export async function getTokenTransfers(
  address: string,
  page: number = 1,
  offset: number = 50,
  sort: 'asc' | 'desc' = 'desc'
): Promise<any[]> {
  const result = await rateLimiter.request({
    module: 'account',
    action: 'tokentx',
    address,
    startblock: '0',
    endblock: '99999999',
    page: String(page),
    offset: String(offset),
    sort,
  });

  return Array.isArray(result) ? result : [];
}

/**
 * Get internal transactions for an address
 */
export async function getInternalTransactions(
  address: string,
  page: number = 1,
  offset: number = 20
): Promise<any[]> {
  const result = await rateLimiter.request({
    module: 'account',
    action: 'txlistinternal',
    address,
    startblock: '0',
    endblock: '99999999',
    page: String(page),
    offset: String(offset),
    sort: 'desc',
  });

  return Array.isArray(result) ? result : [];
}

/**
 * Get verified contract source code
 */
export async function getContractSource(address: string): Promise<{
  sourceName: string;
  sourceCode: string;
  abi: string;
  compilerVersion: string;
  isVerified: boolean;
}> {
  const result = await rateLimiter.request({
    module: 'contract',
    action: 'getsourcecode',
    address,
  });

  if (!Array.isArray(result) || result.length === 0) {
    return {
      sourceName: 'Unknown',
      sourceCode: '',
      abi: '[]',
      compilerVersion: '',
      isVerified: false,
    };
  }

  const contract = result[0];

  return {
    sourceName: contract.ContractName || 'Unknown',
    sourceCode: contract.SourceCode || '',
    abi: contract.ABI || '[]',
    compilerVersion: contract.CompilerVersion || '',
    isVerified: contract.ABI !== 'Contract source code not verified',
  };
}

/**
 * Get contract ABI only
 */
export async function getContractABI(address: string): Promise<string> {
  const result = await rateLimiter.request({
    module: 'contract',
    action: 'getabi',
    address,
  });

  return typeof result === 'string' ? result : '[]';
}

/**
 * Get ERC-20 token transfers for a specific transaction hash
 */
export async function getERC20TransfersByTx(
  txHash: string,
  address: string
): Promise<any[]> {
  // Etherscan doesn't have a direct "by tx hash" filter,
  // so we get all transfers for the sender and filter
  const transfers = await getTokenTransfers(address, 1, 100);
  return transfers.filter((t: any) => t.hash?.toLowerCase() === txHash.toLowerCase());
}

/**
 * Get ETH price in USD
 */
export async function getEthPrice(): Promise<number> {
  const result = await rateLimiter.request({
    module: 'stats',
    action: 'ethprice',
  });

  return parseFloat(result?.ethusd || '0');
}
