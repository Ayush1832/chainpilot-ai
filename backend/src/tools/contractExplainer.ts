// ============================================================
// ChainPilot AI — Tool: Smart Contract Explainer
// ============================================================
// Fetches verified contract source code and prepares it for
// AI-powered explanation.
//
// getContractSource(address) → ContractInfo + summary context
// ============================================================

import * as etherscanService from '../services/etherscanService';
import { ContractInfo } from '../types';

/**
 * Fetch and prepare contract source code for AI explanation
 */
export async function getContractSource(contractAddress: string): Promise<{
  contractInfo: ContractInfo;
  summaryContext: string;
}> {
  const source = await etherscanService.getContractSource(contractAddress);

  const contractInfo: ContractInfo = {
    address: contractAddress,
    name: source.sourceName,
    sourceCode: source.sourceCode,
    abi: source.abi,
    compiler: source.compilerVersion,
    isVerified: source.isVerified,
  };

  // Build summary context for AI
  let summaryContext = '';

  if (!source.isVerified) {
    summaryContext = `Contract at ${contractAddress} is NOT verified on Etherscan. Source code is unavailable. This is a risk indicator — verified contracts are more transparent and trustworthy.`;
  } else {
    // Extract key information from source for AI context
    const sourceCode = source.sourceCode;
    const functionNames = extractFunctionNames(sourceCode);
    const hasOwner = /onlyOwner|Ownable/i.test(sourceCode);
    const isERC20 = /ERC20|IERC20|totalSupply|balanceOf|transfer\s*\(/i.test(sourceCode);
    const isERC721 = /ERC721|IERC721|tokenURI|ownerOf/i.test(sourceCode);
    const isProxy = /proxy|delegatecall|implementation/i.test(sourceCode);
    const hasStaking = /stake|unstake|reward|staking/i.test(sourceCode);
    const hasFees = /fee|tax|setFee|_fee/i.test(sourceCode);

    summaryContext = `Contract: ${source.sourceName} at ${contractAddress}\n`;
    summaryContext += `Compiler: ${source.compilerVersion}\n`;
    summaryContext += `Verified: Yes\n\n`;

    summaryContext += `Type: `;
    if (isERC20) summaryContext += 'ERC-20 Token ';
    if (isERC721) summaryContext += 'ERC-721 NFT ';
    if (isProxy) summaryContext += 'Proxy Contract ';
    if (hasStaking) summaryContext += 'Staking Contract ';
    if (!isERC20 && !isERC721 && !isProxy && !hasStaking) summaryContext += 'Custom Contract';
    summaryContext += '\n\n';

    summaryContext += `Has Owner Controls: ${hasOwner ? 'Yes' : 'No'}\n`;
    summaryContext += `Has Fee Mechanism: ${hasFees ? 'Yes' : 'No'}\n`;
    summaryContext += `Is Proxy: ${isProxy ? 'Yes (upgradeable)' : 'No'}\n\n`;

    summaryContext += `Key Functions (${functionNames.length} total):\n`;
    for (const fn of functionNames.slice(0, 20)) {
      summaryContext += `  - ${fn}\n`;
    }

    // Truncate source code for AI context (keep first 3000 chars)
    if (sourceCode.length > 3000) {
      summaryContext += `\n\nSource Code (truncated to first 3000 chars):\n${sourceCode.slice(0, 3000)}\n...(truncated)`;
    } else {
      summaryContext += `\n\nFull Source Code:\n${sourceCode}`;
    }
  }

  return { contractInfo, summaryContext };
}

/**
 * Extract function names from Solidity source code
 */
function extractFunctionNames(sourceCode: string): string[] {
  const regex = /function\s+(\w+)\s*\(/g;
  const names: string[] = [];
  let match;

  while ((match = regex.exec(sourceCode)) !== null) {
    // Skip internal/system functions
    const name = match[1];
    if (!names.includes(name) && !name.startsWith('_')) {
      names.push(name);
    }
  }

  return names;
}
