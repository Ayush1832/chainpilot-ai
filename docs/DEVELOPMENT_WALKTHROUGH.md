# ChainPilot AI — Development Walkthrough

## Overview

This document provides a **step-by-step build order** with exact instructions for each milestone. Follow these phases in order — each builds on the previous.

---

## Phase 1: Project Scaffolding (Day 1)

### Step 1.1: Initialize Root

```bash
mkdir chainpilot-ai && cd chainpilot-ai
git init
```

Create root `.gitignore`:
```gitignore
node_modules/
.env
.env.local
dist/
.next/
*.log
```

### Step 1.2: Scaffold Backend

```bash
mkdir backend && cd backend
npm init -y
```

Install dependencies:
```bash
npm install express cors helmet dotenv ethers @langchain/core @langchain/openai langchain @supabase/supabase-js express-rate-limit zod
npm install -D typescript ts-node nodemon @types/express @types/cors @types/node jest ts-jest @types/jest supertest @types/supertest
npx tsc --init
```

Create `tsconfig.json` with:
- `target: ES2022`, `module: commonjs`, `outDir: ./dist`, `rootDir: ./src`
- `strict: true`, `esModuleInterop: true`, `resolveJsonModule: true`

Create directory structure:
```
backend/src/
├── index.ts          (Express app entry point)
├── config/
│   └── env.ts        (load + validate env vars)
├── routes/           (empty, fill in Phase 4)
├── services/         (empty, fill in Phase 2)
├── tools/            (empty, fill in Phase 2)
├── agents/           (empty, fill in Phase 3)
│   └── prompts/      (empty, fill in Phase 3)
├── middleware/
│   ├── errorHandler.ts
│   └── rateLimiter.ts
└── types/
    └── index.ts
```

Create `backend/src/index.ts`:
- Import express, cors, helmet, dotenv
- Configure middleware
- Add health check: `GET /api/health → { status: "ok" }`
- Start server on PORT from env

Create `backend/nodemon.json`:
```json
{ "watch": ["src"], "ext": "ts", "exec": "ts-node src/index.ts" }
```

Add scripts to `package.json`:
```json
{
  "dev": "nodemon",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest"
}
```

**Verify**: `npm run dev` → `curl localhost:4000/api/health` → `{ "status": "ok" }`

### Step 1.3: Scaffold Frontend

```bash
cd .. 
npx -y create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
cd frontend
```

Install additional dependencies:
```bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query react-markdown lucide-react
```

Set up shadcn/ui:
```bash
npx shadcn-ui@latest init
```
Choose: TypeScript, Default style, CSS variables, `src/` alias

Add shadcn components:
```bash
npx shadcn-ui@latest add button card input dialog scroll-area avatar badge separator skeleton
```

**Verify**: `npm run dev` → open `http://localhost:3000` → default Next.js page loads

### Step 1.4: Set Up Supabase

1. Create Supabase project at supabase.com
2. Run the SQL migration from `docs/DATABASE_SCHEMA.md` in SQL Editor
3. Copy API URL + service_role key into `backend/.env`

**Verify**: Tables visible in Supabase Table Editor

### Step 1.5: Configure Environment

Create `backend/.env` and `frontend/.env.local` as described in `docs/ENVIRONMENT_SETUP.md`. Get all API keys.

**Milestone 1 Complete**: Both servers running, database tables created, env configured.

---

## Phase 2: Blockchain Data Layer — Tools (Days 2-4)

### Step 2.1: Build Service Layer

Create services that wrap external API calls with rate limiting and error handling:

1. **`alchemyService.ts`**: Wrap ethers.js provider calls
   - `getEthBalance(address)` → `provider.getBalance()`
   - `getTokenBalances(address)` → Alchemy Enhanced API `alchemy_getTokenBalances`
   - `getNFTs(address)` → Alchemy Enhanced API `getNFTsForOwner`
   - Test: Call with vitalik.eth address, verify balance is returned

2. **`etherscanService.ts`**: Wrap Etherscan REST API with rate-limited queue
   - Implement request queue (200ms between calls)
   - `getTransactionList(address)` → `module=account&action=txlist`
   - `getTokenTransfers(address)` → `module=account&action=tokentx`
   - `getContractSource(address)` → `module=contract&action=getsourcecode`
   - Test: Fetch tx list for a known active address

3. **`defiLlamaService.ts`**: Wrap DeFiLlama REST API
   - `getYields()` → `GET https://yields.llama.fi/pools`
   - `getTokenPrice(address)` → `GET https://coins.llama.fi/prices/current/ethereum:{address}`
   - Test: Fetch yields, verify data shape

4. **`supabaseService.ts`**: Database operations
   - `createConversation()`, `saveMessage()`, `getConversation()`, etc.
   - Test: Create a conversation, save a message, read it back

### Step 2.2: Build Tools

Each tool is a self-contained function that calls services and returns structured data:

1. **`walletAnalyzer.ts`** — calls alchemyService + etherscanService
   - Fetch ETH balance, tokens, NFTs, tx history, DeFi protocols
   - Return `WalletInfo` object
   - **Test**: Analyze `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (vitalik.eth)

2. **`transactionExplainer.ts`** — calls alchemyService + etherscanService
   - Fetch tx receipt, decode logs, identify protocol
   - Return `TransactionInfo` object
   - **Test**: Explain any recent Uniswap swap tx

3. **`tokenRisk.ts`** — calls etherscanService
   - Fetch contract source, check for mint/blacklist functions
   - Fetch holder data, check concentration
   - Return `TokenRiskInfo` with score 1-10
   - **Test**: Analyze USDC (should be low risk) and a random shitcoin (should be high risk)

4. **`contractExplainer.ts`** — calls etherscanService
   - Fetch verified source code
   - Return source + ABI
   - **Test**: Fetch Uniswap V3 Router source

5. **`whaleTracker.ts`** — calls etherscanService
   - Maintain a list of known whale addresses in database
   - Fetch recent large transactions
   - **Test**: Check activity of a known whale address

6. **`defiAdvisor.ts`** — calls defiLlamaService
   - Filter yields by token and minimum APY
   - Sort by APY, return top opportunities
   - **Test**: Get ETH yield opportunities

7. **`ensResolver.ts`** — calls ethers.js provider
   - `provider.resolveName(name)` → address
   - `provider.lookupAddress(address)` → ENS name
   - **Test**: Resolve "vitalik.eth" → verify known address

8. **`transactionExecutor.ts`** — uses ethers.js wallet
   - `sendETH(to, amount, confirmed)` → preview or broadcast
   - `transferERC20(token, to, amount, confirmed)` → preview or broadcast
   - **Test (Sepolia)**: Send 0.001 test ETH between test wallets

**Milestone 2 Complete**: All 8 tools returning real data from APIs.

---

## Phase 3: AI Agent Layer (Days 5-6)

### Step 3.1: Create Prompt Files

Create all prompt files in `backend/src/agents/prompts/`:
- Copy each prompt from `docs/AI_AGENT_DESIGN.md`
- Export as TypeScript string constants

### Step 3.2: Build Intent Detector

Create `backend/src/agents/intentDetector.ts`:
- Single LLM call with the intent detection prompt
- Parse JSON response for `{ intent, params, confidence }`
- Add validation for extracted parameters
- **Test**: Run 10 example prompts, verify correct classification

### Step 3.3: Build Agent Executor

Create `backend/src/agents/chainpilotAgent.ts`:
- Initialize `ChatOpenAI` with model from env
- Wrap each tool as `DynamicStructuredTool` with Zod schemas
- Create `AgentExecutor` with system prompt + tools
- Add `BufferWindowMemory` (k=20) backed by Supabase
- **Test**: Send "Analyze wallet 0xd8dA..." → verify wallet data is returned

### Step 3.4: Test Full Agent Loop

Test scenarios:
1. "Analyze wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" → should call `get_wallet_info`, return report
2. "Is USDC safe?" → should call `get_token_info`, return risk analysis
3. "Where can I earn yield with ETH?" → should call `get_defi_yields`, return strategies
4. "Send 0.1 ETH to 0x91f..." → should return confirmation prompt, NOT execute

**Milestone 3 Complete**: Agent answers questions and calls tools correctly.

---

## Phase 4: Backend API Routes (Day 7)

### Step 4.1: Chat Route

Create `backend/src/routes/chat.ts`:
- `POST /api/chat` — accept message, invoke agent, stream response via SSE
- `GET /api/chat/:conversationId` — fetch conversation history
- `GET /api/chat/conversations` — list conversations

### Step 4.2: Direct Analysis Routes

Create:
- `GET /api/wallet/:address` — call walletAnalyzer directly
- `GET /api/transaction/:hash` — call transactionExplainer directly
- `GET /api/token/:address` — call tokenRisk directly
- `GET /api/defi/yields` — call defiAdvisor directly

### Step 4.3: Transaction Confirmation Route

Create `backend/src/routes/transaction.ts`:
- `POST /api/transaction/confirm` — confirm or reject pending tx

### Step 4.4: Register Routes + Middleware

Update `index.ts`:
- Mount all routers under `/api`
- Add rate limiters per route group
- Add error handler middleware

**Verify**: Test all routes with curl or Postman

**Milestone 4 Complete**: All API endpoints working and returning data.

---

## Phase 5: Frontend UI (Days 8-10)

### Step 5.1: Set Up Providers

Update `frontend/src/app/layout.tsx`:
- Add RainbowKit + Wagmi providers
- Add QueryClientProvider
- Configure dark theme

### Step 5.2: Build Landing Page

Create `frontend/src/app/page.tsx`:
- Hero section with gradient background
- Feature cards (6 features in 2 rows)
- Example prompts carousel
- "Launch App" button → navigate to `/chat`

### Step 5.3: Build Chat Page

Create `frontend/src/app/chat/page.tsx`:
- Sidebar (left) + chat area (right)
- Chat area: message list + input box at bottom
- SSE listener for streaming agent responses
- Auto-scroll on new messages

### Step 5.4: Build Components

Create each component from `docs/FRONTEND_DESIGN.md`:
1. `ChatMessage.tsx` — with markdown rendering
2. `WalletReport.tsx` — structured wallet card
3. `TransactionSummary.tsx` — tx explanation card
4. `TokenRiskCard.tsx` — risk score display
5. `ConfirmationModal.tsx` — tx confirmation overlay
6. `Sidebar.tsx` — conversation list

### Step 5.5: Connect to Backend

Create `frontend/src/lib/api.ts`:
- SSE client for streaming chat
- REST client for other endpoints

### Step 5.6: Style & Polish

- Apply design system from `docs/FRONTEND_DESIGN.md`
- Add animations (message entrance, typing indicator, risk gauge)
- Ensure mobile responsiveness

**Milestone 5 Complete**: Full UI working with wallet connect and chat.

---

## Phase 6: Polish & Advanced Features (Days 11-12)

### Step 6.1: Multi-Step Transactions

Update agent to handle compound prompts:
- "Swap 1 ETH to USDC and send to 0xabc" → plan 2 steps → confirm → execute

### Step 6.2: Portfolio Analyzer

Add portfolio pie chart component to show token distribution.

### Step 6.3: Whale Alerts

Add real-time whale activity badge in sidebar.

### Step 6.4: Final Polish

- Code cleanup
- Add loading states everywhere
- Error toasts for failed requests
- Empty states for new conversations
- SEO meta tags

---

## Phase 7: Deployment & README (Day 13)

### Step 7.1: Deploy Backend

Deploy to **Railway** or **Render** (free tier):
1. Connect GitHub repo
2. Set build command: `cd backend && npm install && npm run build`
3. Set start command: `cd backend && npm start`
4. Add all env variables
5. Verify health check

### Step 7.2: Deploy Frontend

Deploy to **Vercel** (free tier):
1. Connect GitHub repo
2. Set root directory: `frontend`
3. Add `NEXT_PUBLIC_API_URL` env var pointing to deployed backend
4. Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
5. Verify live site

### Step 7.3: Write README

Create `README.md` with:
- Project description + screenshot/gif
- Features list
- Tech stack
- Setup instructions
- Architecture diagram
- License

### Step 7.4: Record Demo

Record a demo video (1-2 minutes) showing:
1. Wallet analysis
2. Transaction explanation
3. Token risk check
4. Sending test ETH (on Sepolia)

---

## Final Checklist

- [ ] All 8 tools working with real API data
- [ ] AI agent correctly selects tools for each intent
- [ ] Chat streaming works end-to-end
- [ ] Transaction confirmation flow works on Sepolia
- [ ] All UI components render correctly
- [ ] Mobile responsive
- [ ] No hardcoded API keys
- [ ] Security checklist passed (see SECURITY.md)
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] README.md complete
- [ ] Demo video recorded
- [ ] GitHub repo public with proper description
