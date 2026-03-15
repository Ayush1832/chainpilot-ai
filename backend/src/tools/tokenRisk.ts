// ============================================================
// ChainPilot AI — Tool: Token Risk Analyzer
// ============================================================
// Analyzes ERC-20 token contracts for potential risks.
//
// getTokenRisk(contractAddress) → TokenRiskInfo
// ============================================================

import * as etherscanService from '../services/etherscanService';
import * as theGraphService from '../services/theGraphService';
import * as alchemyService from '../services/alchemyService';
import { TokenRiskInfo, RiskItem, HolderInfo } from '../types';

// Dangerous function signatures to look for in source code
const DANGEROUS_PATTERNS = [
  { pattern: /function\s+mint\s*\(/gi, category: 'function' as const, severity: 'high' as const, description: 'Owner can mint new tokens (unlimited supply risk)' },
  { pattern: /function\s+_mint\s*\(/gi, category: 'function' as const, severity: 'medium' as const, description: 'Contract has internal mint function' },
  { pattern: /function\s+blacklist/gi, category: 'function' as const, severity: 'high' as const, description: 'Contract has blacklist capability (can block users)' },
  { pattern: /function\s+pause/gi, category: 'function' as const, severity: 'medium' as const, description: 'Contract can be paused (trading can be stopped)' },
  { pattern: /function\s+setFee/gi, category: 'function' as const, severity: 'high' as const, description: 'Owner can modify transfer fees' },
  { pattern: /function\s+setMaxTransaction/gi, category: 'function' as const, severity: 'medium' as const, description: 'Owner can limit transaction sizes' },
  { pattern: /onlyOwner/gi, category: 'ownership' as const, severity: 'medium' as const, description: 'Contract has owner-only functions' },
  { pattern: /renounceOwnership/gi, category: 'ownership' as const, severity: 'low' as const, description: 'Ownership can be renounced (positive sign)' },
  { pattern: /selfdestruct|delegatecall/gi, category: 'function' as const, severity: 'high' as const, description: 'Contract contains dangerous low-level operations' },
  { pattern: /function\s+withdraw/gi, category: 'ownership' as const, severity: 'medium' as const, description: 'Owner can withdraw funds from contract' },
];

/**
 * Analyze a token contract for risks
 */
export async function getTokenRisk(contractAddress: string): Promise<TokenRiskInfo> {
  // Fetch contract data in parallel
  const [contractSource, tokenMetadata] = await Promise.all([
    etherscanService.getContractSource(contractAddress),
    alchemyService.getTokenMetadata(contractAddress),
  ]);

  // Analyze source code for dangerous patterns
  const risks: RiskItem[] = [];
  let hasMintFunction = false;
  let hasBlacklist = false;

  if (contractSource.isVerified && contractSource.sourceCode) {
    for (const check of DANGEROUS_PATTERNS) {
      if (check.pattern.test(contractSource.sourceCode)) {
        // Reset lastIndex since we're reusing regex with 'g' flag
        check.pattern.lastIndex = 0;

        risks.push({
          category: check.category,
          severity: check.severity,
          description: check.description,
        });

        if (check.description.includes('mint')) hasMintFunction = true;
        if (check.description.includes('blacklist')) hasBlacklist = true;
      }
    }
  } else {
    risks.push({
      category: 'function',
      severity: 'high',
      description: 'Contract source code is not verified on Etherscan',
    });
  }

  // Check liquidity on Uniswap
  let liquidityLocked = false;
  let liquidityUsd = 0;
  try {
    const liquidityData = await theGraphService.getTokenLiquidity(contractAddress);
    liquidityUsd = parseFloat(liquidityData.totalValueLockedUSD);
    // If there is significant liquidity, it's a positive sign
    if (liquidityUsd < 10000) {
      risks.push({
        category: 'liquidity',
        severity: 'high',
        description: `Very low liquidity ($${liquidityUsd.toFixed(0)}) — high price impact risk`,
      });
    } else if (liquidityUsd < 100000) {
      risks.push({
        category: 'liquidity',
        severity: 'medium',
        description: `Moderate liquidity ($${liquidityUsd.toFixed(0)})`,
      });
    }
  } catch {
    risks.push({
      category: 'liquidity',
      severity: 'medium',
      description: 'Could not verify liquidity data',
    });
  }

  // Get token transfers to estimate holder concentration
  let topHolders: HolderInfo[] = [];
  let holderCount = 0;
  try {
    const transfers = await etherscanService.getTokenTransfers(contractAddress, 1, 100);
    const holderBalances = estimateHolders(transfers, contractAddress);
    topHolders = holderBalances.slice(0, 5);
    holderCount = holderBalances.length;

    // Check holder concentration
    if (topHolders.length > 0 && topHolders[0].percentage > 50) {
      risks.push({
        category: 'concentration',
        severity: 'high',
        description: `Top wallet holds ${topHolders[0].percentage.toFixed(1)}% of supply`,
      });
    } else if (topHolders.length > 0 && topHolders[0].percentage > 20) {
      risks.push({
        category: 'concentration',
        severity: 'medium',
        description: `Top wallet holds ${topHolders[0].percentage.toFixed(1)}% of supply`,
      });
    }
  } catch {
    // Unable to fetch holder data
  }

  // Calculate risk score (1-10)
  const riskScore = calculateRiskScore(risks, contractSource.isVerified, liquidityUsd);

  // Determine recommendation
  const recommendation = riskScore >= 7 ? 'AVOID' : riskScore >= 4 ? 'CAUTION' : 'SAFE';

  return {
    address: contractAddress,
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    decimals: tokenMetadata.decimals,
    totalSupply: '0', // Would need additional call
    riskScore,
    risks,
    holderCount,
    topHolders,
    liquidityLocked,
    hasMintFunction,
    hasBlacklist,
    isHoneypot: false, // Advanced honeypot detection would need simulation
    recommendation,
  };
}

/**
 * Estimate holder distribution from transfer events
 */
function estimateHolders(
  transfers: any[],
  contractAddress: string
): HolderInfo[] {
  const balances = new Map<string, number>();

  for (const tx of transfers) {
    const from = (tx.from || '').toLowerCase();
    const to = (tx.to || '').toLowerCase();
    const value = parseFloat(tx.value || '0') / Math.pow(10, parseInt(tx.tokenDecimal || '18'));

    if (from !== '0x0000000000000000000000000000000000000000') {
      balances.set(from, (balances.get(from) || 0) - value);
    }
    balances.set(to, (balances.get(to) || 0) + value);
  }

  // Calculate total supply from positive balances
  let totalSupply = 0;
  const positiveHolders: { address: string; balance: number }[] = [];

  for (const [address, balance] of balances) {
    if (balance > 0 && address !== contractAddress.toLowerCase()) {
      totalSupply += balance;
      positiveHolders.push({ address, balance });
    }
  }

  // Sort by balance and calculate percentages
  return positiveHolders
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10)
    .map((h) => ({
      address: h.address,
      percentage: totalSupply > 0 ? (h.balance / totalSupply) * 100 : 0,
    }));
}

/**
 * Calculate risk score (1-10) based on detected risks
 */
function calculateRiskScore(
  risks: RiskItem[],
  isVerified: boolean,
  liquidityUsd: number
): number {
  let score = 1; // Start with minimal risk

  // Each high severity risk adds 2 points
  const highCount = risks.filter((r) => r.severity === 'high').length;
  score += highCount * 2;

  // Each medium severity risk adds 1 point
  const mediumCount = risks.filter((r) => r.severity === 'medium').length;
  score += mediumCount;

  // Unverified source adds 2 points
  if (!isVerified) score += 2;

  // Low liquidity adds points
  if (liquidityUsd < 10000) score += 2;
  else if (liquidityUsd < 100000) score += 1;

  // Cap at 10
  return Math.min(score, 10);
}
