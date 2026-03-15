# ChainPilot AI 🤖⛓️

> AI-powered on-chain intelligence agent that analyzes blockchain activity and executes transactions using natural language.

## Features

- **Wallet Intelligence** — ETH balance, tokens, NFTs, DeFi usage, behavior profiling
- **Transaction Explainer** — Human-readable summaries of any on-chain transaction
- **Token Risk Analyzer** — Automated security scoring of ERC-20 contracts
- **Smart Contract Summaries** — Plain-language contract explanations
- **Whale Tracker** — Alerts on large wallet movements
- **DeFi Strategy Advisor** — Yield recommendations from live data
- **Natural Language Tx Execution** — Send ETH, transfer tokens via chat with confirmation
- **ENS Resolution** — Send to `vitalik.eth` instead of raw addresses

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TailwindCSS, shadcn/ui |
| Wallet | RainbowKit, Wagmi |
| Backend | Express.js, TypeScript |
| AI | OpenAI (ChatGPT), LangChain |
| Blockchain | ethers.js v6 |
| Data APIs | Alchemy, Etherscan, DeFiLlama, The Graph |
| Database | Supabase (PostgreSQL) |

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/chainpilot-ai.git
cd chainpilot-ai

# Backend
cd backend
cp .env.example .env    # Fill in API keys
npm install
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

See [`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md) for detailed API key setup.

## Documentation

| Doc | Description |
|-----|-------------|
| [Project Overview](docs/PROJECT_OVERVIEW.md) | Features, tech stack, directory structure |
| [Architecture](docs/ARCHITECTURE.md) | System diagrams and data flows |
| [Database Schema](docs/DATABASE_SCHEMA.md) | Supabase tables + SQL migration |
| [API Design](docs/API_DESIGN.md) | All endpoints with request/response schemas |
| [AI Agent Design](docs/AI_AGENT_DESIGN.md) | Prompts, tools, intent detection |
| [Blockchain Integration](docs/BLOCKCHAIN_INTEGRATION.md) | API setup and usage |
| [Frontend Design](docs/FRONTEND_DESIGN.md) | UI components and design system |
| [Transaction Execution](docs/TRANSACTION_EXECUTION.md) | Tx lifecycle and confirmation flow |
| [Security](docs/SECURITY.md) | Threat model and safeguards |
| [Dev Walkthrough](docs/DEVELOPMENT_WALKTHROUGH.md) | Step-by-step build guide |

## License

ISC
