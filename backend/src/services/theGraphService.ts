// ============================================================
// ChainPilot AI — The Graph Service
// ============================================================
// Wraps The Graph GraphQL API for DEX liquidity data.
//
// Functions:
//   getTokenLiquidity(address) → Total liquidity in USD
//   getPoolInfo(poolAddress)   → Pool details
//   getRecentSwaps(pool, n)    → Recent swap events
// ============================================================

const UNISWAP_V3_SUBGRAPH =
  'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

/**
 * Execute a GraphQL query against a subgraph
 */
async function querySubgraph(subgraphUrl: string, query: string): Promise<any> {
  const response: Response = await fetch(subgraphUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const data: any = await response.json();

  if (data.errors) {
    throw new Error(`Subgraph error: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

/**
 * Get total liquidity for a token on Uniswap V3
 */
export async function getTokenLiquidity(tokenAddress: string): Promise<{
  totalValueLockedUSD: string;
  poolCount: number;
  symbol: string;
  name: string;
}> {
  const query = `{
    token(id: "${tokenAddress.toLowerCase()}") {
      id
      symbol
      name
      totalValueLockedUSD
      poolCount
    }
  }`;

  const data = await querySubgraph(UNISWAP_V3_SUBGRAPH, query);
  const token = data?.token;

  if (!token) {
    return {
      totalValueLockedUSD: '0',
      poolCount: 0,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
    };
  }

  return {
    totalValueLockedUSD: token.totalValueLockedUSD || '0',
    poolCount: parseInt(token.poolCount || '0', 10),
    symbol: token.symbol || 'UNKNOWN',
    name: token.name || 'Unknown',
  };
}

/**
 * Get pool details from Uniswap V3
 */
export async function getPoolInfo(poolAddress: string): Promise<any> {
  const query = `{
    pool(id: "${poolAddress.toLowerCase()}") {
      id
      token0 { id symbol name decimals }
      token1 { id symbol name decimals }
      feeTier
      liquidity
      sqrtPrice
      totalValueLockedUSD
      volumeUSD
      txCount
    }
  }`;

  const data = await querySubgraph(UNISWAP_V3_SUBGRAPH, query);
  return data?.pool || null;
}

/**
 * Get recent swaps for a pool
 */
export async function getRecentSwaps(
  poolAddress: string,
  count: number = 10
): Promise<any[]> {
  const query = `{
    swaps(
      first: ${count}
      orderBy: timestamp
      orderDirection: desc
      where: { pool: "${poolAddress.toLowerCase()}" }
    ) {
      id
      timestamp
      sender
      recipient
      amount0
      amount1
      amountUSD
      pool { token0 { symbol } token1 { symbol } }
    }
  }`;

  const data = await querySubgraph(UNISWAP_V3_SUBGRAPH, query);
  return data?.swaps || [];
}
