# ChainPilot AI — Blockchain Integration Guide

## Overview

ChainPilot AI integrates with multiple blockchain data providers to fetch on-chain data. All providers offer free tiers sufficient for a portfolio project.

---

## 1. Alchemy

### Purpose
- Ethereum JSON-RPC provider (read chain state)
- Token balances (`alchemy_getTokenBalances`)
- NFT data (`getNFTs`, `getNFTMetadata`)
- Transaction receipts and logs

### Setup
1. Go to [alchemy.com](https://www.alchemy.com/) → Sign up → Create app → Ethereum Mainnet + Sepolia
2. Copy the API key from the dashboard

### Free Tier Limits
- 300M compute units / month
- ~10-20 requests per second

### Service File: `backend/src/services/alchemyService.ts`

**Functions to implement**:

| Function                     | Alchemy Method                  | Returns                          |
|------------------------------|---------------------------------|----------------------------------|
| `getEthBalance(address)`     | `eth_getBalance`                | Balance in ETH (string)          |
| `getTokenBalances(address)`  | `alchemy_getTokenBalances`      | Array of `{ contract, balance }` |
| `getTokenMetadata(contract)` | `alchemy_getTokenMetadata`      | `{ name, symbol, decimals }`     |
| `getNFTs(address)`           | `getNFTsForOwner`               | Array of NFT objects             |
| `getTransactionReceipt(hash)`| `eth_getTransactionReceipt`     | Full receipt with logs           |
| `getTransaction(hash)`       | `eth_getTransactionByHash`      | Transaction object               |
| `getBlock(blockNumber)`      | `eth_getBlockByNumber`          | Block with timestamp             |
| `estimateGas(txParams)`      | `eth_estimateGas`               | Gas estimate (bigint)            |
| `getGasPrice()`              | `eth_gasPrice`                  | Current gas price (bigint)       |

**Configuration**:
```
ALCHEMY_API_KEY=your_api_key_here
ALCHEMY_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/{API_KEY}
ALCHEMY_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/{API_KEY}
```

**Usage with ethers.js**:
```typescript
const provider = new ethers.JsonRpcProvider(
  `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);
```

---

## 2. Etherscan

### Purpose
- Transaction history for addresses
- Contract source code (verified contracts)
- Token holder data
- Internal transactions
- Event logs
- ABI retrieval

### Setup
1. Go to [etherscan.io/apis](https://etherscan.io/apis) → Sign up → Generate API key

### Free Tier Limits
- 5 calls per second
- 100,000 calls per day

### Service File: `backend/src/services/etherscanService.ts`

**Functions to implement**:

| Function                           | Etherscan Module/Action                        | Returns                           |
|------------------------------------|------------------------------------------------|-----------------------------------|
| `getTransactionList(address, page, offset)` | `module=account&action=txlist`       | Array of transaction objects      |
| `getTokenTransfers(address)`       | `module=account&action=tokentx`                | Array of ERC-20 transfer events   |
| `getContractSource(address)`       | `module=contract&action=getsourcecode`         | Source code + ABI                 |
| `getContractABI(address)`          | `module=contract&action=getabi`                | ABI JSON                         |
| `getTokenInfo(contract)`           | `module=token&action=tokeninfo`                | Name, symbol, supply, holders    |
| `getInternalTxs(hash)`            | `module=account&action=txlistinternal`         | Internal transactions             |
| `getERC20TransfersByTx(hash)`     | `module=account&action=tokentx` (filter by tx) | Token transfers in a tx          |

**Base URL**: `https://api.etherscan.io/api`

**Rate Limiting**: Implement a request queue with 200ms delay between calls (5/sec limit).

```typescript
// Example: etherscanService.ts rate limiter pattern
class EtherscanService {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastCallTime = 0;
  private MIN_INTERVAL = 200; // ms (5 calls/sec)

  async request(params: Record<string, string>) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        const elapsed = Date.now() - this.lastCallTime;
        if (elapsed < this.MIN_INTERVAL) {
          await sleep(this.MIN_INTERVAL - elapsed);
        }
        this.lastCallTime = Date.now();
        // ... make request
      });
      this.processQueue();
    });
  }
}
```

---

## 3. DeFiLlama

### Purpose
- DeFi protocol TVL data
- Yield/APY data for farming pools
- Token prices
- Protocol listings

### Setup
- **No API key required** — public API

### Limits
- No official rate limits (be respectful, ~1 req/sec)

### Service File: `backend/src/services/defiLlamaService.ts`

**Functions to implement**:

| Function                      | DeFiLlama Endpoint              | Returns                         |
|-------------------------------|----------------------------------|---------------------------------|
| `getYields()`                 | `GET /yields/pools`              | All yield pools                 |
| `getYieldsByToken(symbol)`    | `GET /yields/pools` + filter     | Filtered yield pools            |
| `getProtocol(name)`           | `GET /protocol/{name}`           | Protocol TVL + chains           |
| `getTokenPrice(chain, addr)`  | `GET /prices/current/{chain}:{addr}` | Current USD price          |
| `getTokenPrices(addresses[])`| `GET /prices/current/{list}`     | Batch price lookup              |

**Base URLs**:
```
Yields:   https://yields.llama.fi
Protocols: https://api.llama.fi
Prices:   https://coins.llama.fi
```

**Example — Fetching yield data**:
```
GET https://yields.llama.fi/pools

Response (truncated):
{
  "data": [
    {
      "pool": "0x...",
      "chain": "Ethereum",
      "project": "lido",
      "symbol": "STETH",
      "tvlUsd": 15200000000,
      "apy": 3.7,
      "apyBase": 3.5,
      "apyReward": 0.2
    }
  ]
}
```

Filter strategy:
1. Fetch all pools
2. Filter by `chain === "Ethereum"`
3. Filter by `symbol` containing the user's token
4. Sort by `apy DESC`
5. Return top 10

---

## 4. The Graph (Free Hosted Service)

### Purpose
- DEX liquidity data (Uniswap, SushiSwap pools)
- On-chain indexed data via GraphQL
- Token pair reserves and trading volume

### Setup
1. Go to [thegraph.com](https://thegraph.com/) → Use the hosted service (free)
2. No API key needed for public subgraphs

### Limits
- 100,000 queries / month (free hosted)

### Service File: `backend/src/services/theGraphService.ts`

**Subgraphs to use**:

| Subgraph       | URL                                                                 | Data Available                    |
|----------------|---------------------------------------------------------------------|-----------------------------------|
| Uniswap V3     | `https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3`       | Pools, positions, swaps, volumes  |
| Uniswap V2     | `https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2`       | Pairs, reserves, trades           |

**Functions to implement**:

| Function                         | Query                               | Returns                         |
|----------------------------------|--------------------------------------|---------------------------------|
| `getTokenLiquidity(address)`     | Token → pairs → reserves            | Total liquidity in USD          |
| `getPoolInfo(poolAddress)`       | Pool details (token0, token1, TVL)   | Pool data object                |
| `getRecentSwaps(poolAddress, n)` | Most recent swaps in a pool          | Array of swap events            |

**Example GraphQL Query** — Token liquidity:
```graphql
{
  token(id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48") {
    id
    symbol
    name
    totalValueLockedUSD
    poolCount
  }
}
```

---

## 5. Covalent (Optional, Free Tier)

### Purpose
- Enriched wallet portfolio data
- Historical token balances
- NFT metadata
- Cross-chain support

### Setup
1. Go to [goldrush.dev](https://goldrush.dev/) → Sign up → Get API key

### Limits
- 4 API credits / second
- Generous free tier for portfolio data

### When to use
Use Covalent as a **fallback** when Alchemy token data is insufficient or when you need historical balance snapshots.

---

## 6. ethers.js (Blockchain Library)

### Purpose
- Direct Ethereum interaction
- Transaction construction and signing
- ENS resolution
- Contract interaction (read/write)
- ABI encoding/decoding

### Version
- **ethers.js v6** (latest major version)

### Key Functions Used

| Function                          | Purpose                                   |
|-----------------------------------|-------------------------------------------|
| `provider.getBalance(address)`    | Get ETH balance                           |
| `provider.getTransaction(hash)`   | Get tx data                               |
| `provider.getTransactionReceipt(hash)` | Get tx receipt with logs             |
| `provider.resolveName(ensName)`   | Resolve ENS → address                    |
| `provider.lookupAddress(address)` | Reverse ENS lookup (address → name)      |
| `wallet.sendTransaction(tx)`      | Sign and broadcast a transaction          |
| `contract.transfer(to, amount)`   | Call ERC-20 transfer                      |
| `ethers.parseEther(amount)`       | Convert ETH string to wei                |
| `ethers.formatEther(wei)`         | Convert wei to ETH string                |
| `ethers.parseUnits(amount, dec)`  | Convert token amount with decimals        |

### Wallet Configuration
```typescript
// Use a dedicated hot wallet for the agent
// NEVER use a wallet with significant funds
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
```

---

## API Key Summary

| Service     | Env Variable           | How to Get                                |
|-------------|------------------------|--------------------------------------------|
| Alchemy     | `ALCHEMY_API_KEY`      | alchemy.com → Dashboard → API key         |
| Etherscan   | `ETHERSCAN_API_KEY`    | etherscan.io → My Account → API keys      |
| OpenAI      | `OPENAI_API_KEY`       | platform.openai.com → API keys            |
| Supabase    | `SUPABASE_URL`         | supabase.com → Project Settings → API     |
| Supabase    | `SUPABASE_SERVICE_KEY` | supabase.com → Project Settings → API     |
| Covalent    | `COVALENT_API_KEY`     | goldrush.dev → Dashboard → API key        |

---

## Rate Limit Management Strategy

Since most APIs have rate limits, implement a global rate limiter:

1. **Request queue per service** — each service maintains its own queue
2. **Token bucket** — track calls/sec and calls/day
3. **Retry with backoff** — on 429 responses, wait and retry (max 3 retries)
4. **Caching** — cache responses for 60 seconds (wallet data), 5 minutes (yields), 24 hours (contract source)

```
Cache Strategy:
  wallet balance    → 60s TTL
  token balances    → 60s TTL
  tx data           → forever (immutable)
  contract source   → 24h TTL
  DeFi yields       → 5min TTL
  token prices      → 60s TTL
  ENS resolution    → 1h TTL
```
