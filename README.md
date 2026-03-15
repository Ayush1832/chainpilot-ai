<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.svg" width="80" alt="ChainPilot Logo" />
  <h1>ChainPilot AI</h1>
  <p><strong>Your AI-Powered On-Chain Intelligence Agent</strong></p>
  <p>Analyze wallets, explain transactions, detect token risks, and execute on-chain — all through natural language.</p>

  <div>
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white" />
    <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" />
    <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain&logoColor=white" />
    <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
  </div>
</div>

---

## ✦ Features

ChainPilot acts as a multi-tool agent. You can ask it to perform tasks across 6 main capabilities:

1. **Wallet Intelligence** (`walletAnalyzer`): Fetches ETH balance, top ERC-20 tokens, NFTs, DeFi protocol interactions, and calculates a behavioral risk score.
2. **Transaction Explainer** (`transactionExplainer`): Demystifies complex hex data into plain English, showing gas costs, protocol names (Uniswap, Aave), and exact token flows.
3. **Token Risk Scanner** (`tokenRisk`): Analyzes ERC-20 contracts for honeypots, mint functions, blacklists, and holder concentration (using GoPlus Security).
4. **Smart Contract Analysis** (`contractExplainer`): Fetches verified source code from Etherscan and explains what the contract does.
5. **DeFi Yield Advisor** (`defiAdvisor`): Pulls real-time APY data from DeFiLlama to recommend the best yield strategies.
6. **Transaction Execution** (`transactionExecutor`): Safely drafts ETH and ERC-20 transfers. The UI intercepts these and presents a secure Confirmation Modal before broadcasting.

---

## 🛠️ Architecture

The application is split into a robust backend and a modern frontend:

- **Backend (`/backend`)**: Express.js server in TypeScript. Houses the LangChain agent loop (`llm.bindTools`), 9 dynamic tool definitions, intent detection validation, and Supabase memory storage.
- **Frontend (`/frontend`)**: Next.js 16 (App Router) with TailwindCSS v4. Features Server-Sent Events (SSE) streaming, a specialized markdown renderer (`react-markdown`) for structured data cards, and Wagmi/RainbowKit for wallet connection.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- API Keys for: OpenAI, Etherscan, Alchemy, Supabase, GoPlus Security (free tier), WalletConnect.

### 1. Clone & Setup
```bash
git clone https://github.com/yourusername/chainpilot-ai.git
cd chainpilot-ai
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Fill in your API keys in .env
npm run dev
```

### 3. Frontend Setup (New Terminal)
```bash
cd frontend
npm install
cp .env.example .env.local # Fill in NEXT_PUBLIC_ variables
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 💡 Example Prompts to Try

* "Analyze wallet `vitalik.eth`"
* "Is this token safe? `0x6B175474E89094C44Da98b954EedeAC495271d0F`"
* "Explain this transaction from yesterday: `0x...`"
* "Send 0.05 ETH to `vitalik.eth`"
* "What is the best yield for USDC right now?"
* "Track whale `0x...`"

---

## 🔒 Security

* Private keys are **never** touched by the backend. Transaction execution tools return unsigned transaction parameters.
* The frontend intercepts the tool call, displays a modal, and uses `wagmi/ethers` to prompt the user's browser wallet (MetaMask, etc.) to sign and broadcast.
* Free APIs are used exclusively, protecting against unexpected cloud billing.

---

## 📝 License
MIT License.
