// ============================================================
// ChainPilot AI — Tool: DeFi Strategy Advisor
// ============================================================
// Fetches live DeFi yield data and recommends strategies.
//
// getDefiYields(token?, minApy?) → YieldOpportunity[]
// ============================================================

import * as defiLlamaService from '../services/defiLlamaService';
import { YieldOpportunity, RiskLevel } from '../types';

/**
 * Get DeFi yield opportunities, optionally filtered by token
 */
export async function getDefiYields(
  token?: string,
  minApy: number = 0,
  chain: string = 'Ethereum'
): Promise<YieldOpportunity[]> {
  let pools: any[];

  if (token) {
    pools = await defiLlamaService.getYieldsByToken(token, chain, minApy);
  } else {
    const allPools = await defiLlamaService.getYields();
    pools = allPools
      .filter((p: any) => {
        const poolChain = (p.chain || '').toLowerCase();
        const poolApy = p.apy || 0;
        const poolTvl = p.tvlUsd || 0;
        return (
          poolChain === chain.toLowerCase() &&
          poolApy >= minApy &&
          poolTvl > 1_000_000 // Min $1M TVL for general recommendations
        );
      })
      .sort((a: any, b: any) => (b.apy || 0) - (a.apy || 0))
      .slice(0, 15);
  }

  return pools.map((pool: any) => {
    const apy = pool.apy || 0;
    const tvl = pool.tvlUsd || 0;

    return {
      protocol: pool.project || 'Unknown',
      pool: pool.pool || '',
      token: pool.symbol || 'Unknown',
      apy: Math.round(apy * 100) / 100,
      apyBase: Math.round((pool.apyBase || 0) * 100) / 100,
      apyReward: Math.round((pool.apyReward || 0) * 100) / 100,
      tvl: Math.round(tvl),
      chain: pool.chain || 'Ethereum',
      riskLevel: assessYieldRisk(apy, tvl, pool.project),
      description: generateYieldDescription(pool),
    };
  });
}

/**
 * Assess risk level for a yield opportunity
 */
function assessYieldRisk(
  apy: number,
  tvl: number,
  protocol: string
): RiskLevel {
  // Well-known protocols with large TVL are lower risk
  const trustedProtocols = [
    'lido', 'aave-v3', 'aave-v2', 'compound-v3', 'compound-v2',
    'maker', 'curve-dex', 'convex-finance', 'uniswap-v3', 'rocket-pool',
  ];

  const isTrusted = trustedProtocols.includes(protocol?.toLowerCase());

  if (apy > 100) return 'Critical'; // Suspiciously high APY
  if (apy > 50) return 'High';
  if (apy > 20 && !isTrusted) return 'High';
  if (apy > 10 && tvl < 10_000_000) return 'Medium';
  if (isTrusted && tvl > 100_000_000) return 'Low';
  return 'Medium';
}

/**
 * Generate a description for a yield opportunity
 */
function generateYieldDescription(pool: any): string {
  const protocol = pool.project || 'Unknown';
  const symbol = pool.symbol || 'Unknown';
  const apy = (pool.apy || 0).toFixed(2);
  const tvl = formatUsd(pool.tvlUsd || 0);

  const parts: string[] = [];

  // Determine type of yield
  if (symbol.includes('-') || symbol.includes('/')) {
    parts.push(`Provide ${symbol} liquidity on ${protocol}`);
    parts.push(`⚠️ Impermanent loss risk for LP positions`);
  } else if (protocol.toLowerCase().includes('lido') || protocol.toLowerCase().includes('rocket')) {
    parts.push(`Liquid staking on ${protocol}`);
  } else if (protocol.toLowerCase().includes('aave') || protocol.toLowerCase().includes('compound')) {
    parts.push(`Lending on ${protocol}`);
  } else if (protocol.toLowerCase().includes('curve')) {
    parts.push(`Curve pool staking on ${protocol}`);
  } else {
    parts.push(`Yield farming on ${protocol}`);
  }

  parts.push(`APY: ${apy}% | TVL: ${tvl}`);

  if (pool.apyReward && pool.apyReward > 0) {
    parts.push(`Includes ${pool.apyReward.toFixed(2)}% reward APY`);
  }

  return parts.join('. ');
}

/**
 * Format USD value with abbreviations
 */
function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
