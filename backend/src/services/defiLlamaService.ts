// ============================================================
// ChainPilot AI — DeFiLlama Service
// ============================================================
// Wraps DeFiLlama public API (no key required).
//
// Functions:
//   getYields()              → All yield pools
//   getYieldsByToken(symbol) → Filtered by token
//   getProtocol(name)        → Protocol TVL data
//   getTokenPrice(address)   → Current USD price
//   getTokenPrices(addrs[])  → Batch price lookup
// ============================================================

const YIELDS_BASE = 'https://yields.llama.fi';
const PROTOCOLS_BASE = 'https://api.llama.fi';
const PRICES_BASE = 'https://coins.llama.fi';

// Simple in-memory cache
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Fetch all yield pools from DeFiLlama
 * Cached for 5 minutes
 */
export async function getYields(): Promise<any[]> {
  const cacheKey = 'yields_all';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${YIELDS_BASE}/pools`);
  const data: any = await response.json();
  const pools = data.data || [];

  setCache(cacheKey, pools, 5 * 60 * 1000); // 5 min TTL
  return pools;
}

/**
 * Get yield opportunities filtered by token symbol and chain
 */
export async function getYieldsByToken(
  symbol: string,
  chain: string = 'Ethereum',
  minApy: number = 0
): Promise<any[]> {
  const pools = await getYields();

  const upperSymbol = symbol.toUpperCase();
  const lowerChain = chain.toLowerCase();

  return pools
    .filter((pool: any) => {
      const poolSymbol = (pool.symbol || '').toUpperCase();
      const poolChain = (pool.chain || '').toLowerCase();
      const poolApy = pool.apy || 0;

      return (
        poolSymbol.includes(upperSymbol) &&
        poolChain === lowerChain &&
        poolApy >= minApy &&
        pool.tvlUsd > 100000 // Minimum $100K TVL for relevance
      );
    })
    .sort((a: any, b: any) => (b.apy || 0) - (a.apy || 0))
    .slice(0, 10);
}

/**
 * Get protocol TVL and details
 */
export async function getProtocol(name: string): Promise<any> {
  const cacheKey = `protocol_${name}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${PROTOCOLS_BASE}/protocol/${name}`);
  const data: any = await response.json();

  setCache(cacheKey, data, 5 * 60 * 1000);
  return data;
}

/**
 * Get current USD price for a token on Ethereum
 */
export async function getTokenPrice(contractAddress: string): Promise<number> {
  const key = `ethereum:${contractAddress.toLowerCase()}`;
  const cacheKey = `price_${key}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${PRICES_BASE}/prices/current/${key}`);
  const data: any = await response.json();

  const price = data.coins?.[key]?.price || 0;
  setCache(cacheKey, price, 60 * 1000); // 1 min TTL
  return price;
}

/**
 * Get current USD prices for multiple tokens (batch)
 */
export async function getTokenPrices(
  contractAddresses: string[]
): Promise<Record<string, number>> {
  const keys = contractAddresses.map((a) => `ethereum:${a.toLowerCase()}`);
  const coinsParam = keys.join(',');

  const response = await fetch(`${PRICES_BASE}/prices/current/${coinsParam}`);
  const data: any = await response.json();

  const prices: Record<string, number> = {};
  for (const key of keys) {
    const address = key.replace('ethereum:', '');
    prices[address] = data.coins?.[key]?.price || 0;
  }

  return prices;
}

/**
 * Get ETH price from DeFiLlama
 */
export async function getEthPriceFromLlama(): Promise<number> {
  // WETH address on Ethereum
  return getTokenPrice('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
}
