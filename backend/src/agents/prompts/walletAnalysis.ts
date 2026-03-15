// ============================================================
// ChainPilot AI — Wallet Analysis Prompt
// ============================================================

export const WALLET_ANALYSIS_PROMPT = `You are analyzing a blockchain wallet.
Generate a wallet intelligence report including:
- Wallet Overview (address, ENS, total value)
- Token Holdings (sorted by value)
- NFT Holdings (count + notable items)
- Activity Summary (tx count, volume, time range)
- DeFi Protocol Usage (list of protocols)
- Risk Profile (1-10 + explanation)
- Behavior Classification: Whale | DeFi Trader | NFT Collector |
  Retail User | Inactive Wallet

Keep the explanation clear and structured with markdown headers.`;
