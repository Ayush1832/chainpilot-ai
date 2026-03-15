# ChainPilot AI — Environment Setup

## Prerequisites

| Tool      | Version   | Install                                     |
|-----------|-----------|----------------------------------------------|
| Node.js   | 18+ LTS   | [nodejs.org](https://nodejs.org/)            |
| npm       | 9+        | Bundled with Node.js                         |
| Git       | 2.x       | [git-scm.com](https://git-scm.com/)         |

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/chainpilot-ai.git
cd chainpilot-ai
```

---

## 2. Get API Keys (All Free)

### Alchemy (Blockchain RPC)
1. Go to [alchemy.com](https://www.alchemy.com/) → Sign up
2. Create a new app: **Network = Ethereum**, **Chain = Mainnet**
3. Create another app for **Sepolia** testnet
4. Copy the API key from each app dashboard

### Etherscan (Blockchain Data)
1. Go to [etherscan.io/register](https://etherscan.io/register) → Sign up
2. Go to **My Account → API Keys → Add**
3. Copy the API key

### OpenAI (AI/LLM)
1. Go to [platform.openai.com](https://platform.openai.com/) → Sign up
2. Go to **API Keys → Create new secret key**
3. Copy the key (shown only once)
4. Add credits or use free trial credits

### Supabase (Database)
1. Go to [supabase.com](https://supabase.com/) → Sign up
2. Create a new project (remember the database password)
3. Go to **Project Settings → API**
4. Copy the **Project URL** and **service_role key** (not the anon key)

### WalletConnect (Wallet Modal)
1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com/) → Sign up
2. Create a new project
3. Copy the **Project ID**

### Agent Wallet (Transaction Execution)
1. Create a **new** Ethereum wallet (e.g., via MetaMask → Create Account)
2. Export the private key
3. **IMPORTANT**: This must be a dedicated wallet. Never use your main wallet.
4. For testing, get Sepolia test ETH from [sepoliafaucet.com](https://sepoliafaucet.com/)

---

## 3. Environment Variables

### Backend (`backend/.env`)

Create `backend/.env` from the template:

```bash
cp backend/.env.example backend/.env
```

Fill in all values:

```env
# Server
PORT=4000
NODE_ENV=development

# Blockchain - Alchemy
ALCHEMY_API_KEY=your_alchemy_api_key
ALCHEMY_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_alchemy_api_key
ALCHEMY_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_api_key

# Blockchain - Etherscan
ETHERSCAN_API_KEY=your_etherscan_api_key

# Blockchain - Agent Wallet
AGENT_PRIVATE_KEY=your_agent_wallet_private_key
ACTIVE_NETWORK=sepolia

# AI - OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# Database - Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Optional
COVALENT_API_KEY=your_covalent_api_key

# Security
TX_MAX_ETH_PER_TX=1.0
TX_MAX_ETH_PER_DAY=5.0
TX_CONFIRMATION_TIMEOUT_MINUTES=15
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

---

## 4. Install Dependencies

### Backend

```bash
cd backend
npm install
```

**Key packages**:
```
express
cors
helmet
dotenv
ethers
langchain
@langchain/openai
@supabase/supabase-js
express-rate-limit
zod
typescript
ts-node
nodemon
jest
supertest
@types/express
@types/cors
@types/node
```

### Frontend

```bash
cd frontend
npm install
```

**Key packages**:
```
next
react
react-dom
tailwindcss
postcss
autoprefixer
@rainbow-me/rainbowkit
wagmi
viem
@tanstack/react-query
react-markdown
lucide-react
class-variance-authority
clsx
tailwind-merge
```

---

## 5. Database Setup

### Run SQL Migration

1. Open Supabase dashboard → **SQL Editor**
2. Paste the SQL from `docs/DATABASE_SCHEMA.md` (the full migration script)
3. Run the query
4. Verify tables are created in **Table Editor**

### Enable Realtime (Optional)

1. Go to **Database → Replication**
2. Enable replication for the `messages` table

---

## 6. Run Locally

### Start Backend

```bash
cd backend
npm run dev
```

Backend starts on `http://localhost:4000`. Verify:

```bash
curl http://localhost:4000/api/health
# Expected: { "status": "ok" }
```

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend starts on `http://localhost:3000`. Open in browser.

---

## 7. Project Scripts

### Backend (`backend/package.json`)

| Script          | Command               | Purpose                     |
|-----------------|------------------------|-----------------------------|
| `dev`           | `nodemon src/index.ts` | Dev server with hot reload  |
| `build`         | `tsc`                  | Compile TypeScript          |
| `start`         | `node dist/index.js`   | Production server           |
| `test`          | `jest`                 | Run unit tests              |
| `test:watch`    | `jest --watch`         | Run tests in watch mode     |

### Frontend (`frontend/package.json`)

| Script  | Command          | Purpose              |
|---------|------------------|-----------------------|
| `dev`   | `next dev`       | Dev server            |
| `build` | `next build`     | Production build      |
| `start` | `next start`     | Production server     |
| `lint`  | `next lint`      | ESLint check          |

---

## 8. Common Issues

| Issue                           | Fix                                              |
|----------------------------------|--------------------------------------------------|
| `ALCHEMY_API_KEY is not set`     | Check `.env` file exists and key is filled      |
| `etherscan rate limit`           | Wait 1 second, the queue will auto-retry        |
| `OpenAI 401`                     | Regenerate API key, check credits               |
| `Supabase connection refused`    | Verify `SUPABASE_URL` and `SERVICE_KEY`         |
| `wallet nonce too low`           | Restart backend (nonce cache clears)            |
| `CORS error`                     | Check frontend URL in backend CORS config       |
| `MetaMask popup not showing`     | Check WalletConnect Project ID                  |
