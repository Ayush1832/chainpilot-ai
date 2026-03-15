# ChainPilot AI — Project Overview

## What Is It?

ChainPilot AI is an AI-powered on-chain intelligence agent that analyzes blockchain activity and executes transactions using natural language. It integrates LLM-based agents with Ethereum data sources to provide:

- **Wallet analytics** — balances, tokens, NFTs, DeFi usage, behavior profiling
- **Transaction explanations** — human-readable summaries of any on-chain transaction
- **Token risk detection** — automated security scoring of ERC-20 contracts
- **Smart contract summaries** — plain-language explanations of verified contracts
- **Whale tracking** — alerts on large wallet movements
- **DeFi strategy advice** — yield opportunity recommendations from live data
- **Natural language transaction execution** — send ETH, transfer tokens, swap assets via chat
- **ENS resolution** — send to `vitalik.eth` instead of raw addresses
- **Portfolio analysis** — distribution breakdown with risk profiling

---

## Core Features

### 1. Wallet Intelligence Analyzer

User provides a wallet address → agent fetches ETH balance, ERC-20 holdings, NFTs, DeFi protocol usage, transaction history, and P/L estimate → AI generates a **behavior profile** (Whale, DeFi Trader, NFT Collector, Retail User, Inactive).

### 2. Transaction Explainer

User provides a transaction hash → agent fetches value, token transfers, contracts interacted, gas used, protocol → AI converts raw data into a **human-language summary**.

### 3. Token Risk Analyzer

User provides a token contract address → agent checks liquidity lock status, holder concentration, mint functions, blacklist capability, ownership control, honeypot indicators → outputs a **risk score (1–10)** with detected risks.

### 4. Smart Contract Explainer

User provides a contract address → agent fetches verified source code from Etherscan → AI summarizes **purpose, key functions, owner permissions, and potential risks**.

### 5. Whale Activity Tracker

Monitors a set of known whale wallets → reports large transactions (buys, sells, transfers) as alerts.

### 6. DeFi Strategy Advisor

User asks about yield → agent fetches live data from DeFiLlama → recommends **strategies with APY, protocol, risk level, and required assets**.

### 7. Natural Language Transaction Execution

User types e.g. "Send 0.5 ETH to 0x9a3…" → agent parses intent, builds transaction, displays **confirmation prompt** → user confirms → agent broadcasts transaction. **Never auto-executes.**

### 8. Multi-Step Transaction Plans

User types e.g. "Swap 1 ETH to USDC and send to 0xabc" → agent plans multiple steps, presents the plan, executes sequentially after confirmation.

### 9. ENS Resolution

Natural language references to `.eth` names are resolved to addresses before execution.

### 10. Portfolio Analyzer

User provides a wallet → agent outputs a **token distribution breakdown** (% allocation) with overall risk level.

---

## Tech Stack

| Layer            | Technology                                   |
|------------------|----------------------------------------------|
| Frontend         | Next.js (App Router), TailwindCSS, shadcn/ui |
| Wallet Connect   | RainbowKit, Wagmi                            |
| Backend          | Node.js, Express.js, TypeScript              |
| AI / LLM         | OpenAI (ChatGPT), LangChain                  |
| Blockchain       | ethers.js v6                                 |
| Data APIs        | Alchemy, Etherscan, Covalent, The Graph, DeFiLlama |
| Database         | Supabase (PostgreSQL, free tier)             |
| Testing          | Jest, Supertest                              |

---

## Target Chains

- **Primary**: Ethereum Mainnet
- **Testing**: Sepolia Testnet
- **Future**: Any EVM-compatible chain (Polygon, Arbitrum, BSC)

---

## GitHub Description

> ChainPilot AI is an AI-powered on-chain intelligence agent that analyzes blockchain activity and executes transactions using natural language. The system integrates LLM-based agents with Ethereum data sources to provide wallet analytics, transaction explanations, token risk detection, and AI-driven transaction execution.

---

## Project Directory Structure

```
chainpilot-ai/
├── frontend/                  # Next.js application
│   ├── app/                   # App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── chat/
│   │   │   └── page.tsx       # Chat interface
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ChatMessage.tsx
│   │   ├── WalletReport.tsx
│   │   ├── TransactionSummary.tsx
│   │   ├── TokenRiskCard.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── Sidebar.tsx
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                   # Utilities
│   │   ├── api.ts             # Backend API client
│   │   └── wagmi.ts           # Wagmi config
│   ├── styles/
│   │   └── globals.css
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
│
├── backend/                   # Express.js API server
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── config/
│   │   │   └── env.ts         # Environment variables
│   │   ├── routes/
│   │   │   ├── chat.ts
│   │   │   ├── wallet.ts
│   │   │   ├── transaction.ts
│   │   │   ├── token.ts
│   │   │   └── defi.ts
│   │   ├── services/
│   │   │   ├── alchemyService.ts
│   │   │   ├── etherscanService.ts
│   │   │   ├── defiLlamaService.ts
│   │   │   ├── theGraphService.ts
│   │   │   └── supabaseService.ts
│   │   ├── tools/
│   │   │   ├── walletAnalyzer.ts
│   │   │   ├── transactionExplainer.ts
│   │   │   ├── tokenRisk.ts
│   │   │   ├── contractExplainer.ts
│   │   │   ├── whaleTracker.ts
│   │   │   ├── defiAdvisor.ts
│   │   │   ├── ensResolver.ts
│   │   │   └── transactionExecutor.ts
│   │   ├── agents/
│   │   │   ├── chainpilotAgent.ts
│   │   │   ├── intentDetector.ts
│   │   │   └── prompts/
│   │   │       ├── systemPrompt.ts
│   │   │       ├── toolInstructions.ts
│   │   │       ├── intentDetection.ts
│   │   │       ├── walletAnalysis.ts
│   │   │       ├── transactionExplanation.ts
│   │   │       ├── tokenRiskAnalysis.ts
│   │   │       ├── transactionConfirmation.ts
│   │   │       ├── defiStrategy.ts
│   │   │       └── contractExplainer.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   └── types/
│   │       └── index.ts
│   ├── __tests__/
│   │   ├── tools/
│   │   ├── agents/
│   │   └── routes/
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                      # Project documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_DESIGN.md
│   ├── AI_AGENT_DESIGN.md
│   ├── BLOCKCHAIN_INTEGRATION.md
│   ├── FRONTEND_DESIGN.md
│   ├── TRANSACTION_EXECUTION.md
│   ├── SECURITY.md
│   ├── ENVIRONMENT_SETUP.md
│   └── DEVELOPMENT_WALKTHROUGH.md
│
├── .env.example
├── .gitignore
├── README.md
└── package.json               # Root workspace (optional)
```
