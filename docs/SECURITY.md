# ChainPilot AI — Security Design

## Threat Model

### Assets at Risk

| Asset                  | Risk Level | Description                           |
|------------------------|------------|---------------------------------------|
| Agent private key      | CRITICAL   | Controls hot wallet funds             |
| User conversation data | MEDIUM     | May contain addresses, balances       |
| API keys               | HIGH       | Alchemy, Etherscan, OpenAI access     |
| Supabase credentials   | HIGH       | Database read/write access            |

---

## 1. Transaction Security

### 1.1 Confirmation Gate (MOST CRITICAL)

**Rule**: No transaction is ever broadcast without explicit user confirmation.

**Implementation layers**:

1. **Prompt-level**: System prompt instructs AI to never auto-execute
2. **Tool-level**: Tool has `confirmed` boolean parameter; returns preview when `false`
3. **API-level**: `POST /api/transaction/confirm` requires `pendingTxId` + `confirmed: true`
4. **Database-level**: `pending_transactions` table tracks state machine:
   ```
   awaiting_confirmation → confirmed → broadcast → mined
                        → rejected
                                    → failed
   ```

### 1.2 Transaction Limits

Apply server-side limits to prevent catastrophic losses:

```typescript
const TX_LIMITS = {
  maxEthPerTx: '1.0',           // Max 1 ETH per single transaction
  maxEthPerDay: '5.0',          // Max 5 ETH total per day
  maxErc20UsdPerTx: 10000,      // Max $10,000 in ERC-20 per tx
  maxTxPerHour: 10,             // Rate limit
  cooldownSeconds: 30,          // Min 30s between transactions
};
```

Check these limits in the transaction executor BEFORE generating a preview.

### 1.3 Address Validation

```typescript
function validateAddress(address: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Basic format check
  if (!ethers.isAddress(address)) {
    return { valid: false, warnings: ['Invalid Ethereum address format'] };
  }

  // Check for zero address
  if (address === ethers.ZeroAddress) {
    return { valid: false, warnings: ['Cannot send to zero address (burn address)'] };
  }

  // Checksum validation (warn if not checksummed)
  const checksummed = ethers.getAddress(address);
  if (address !== checksummed && address !== address.toLowerCase()) {
    warnings.push('Address has incorrect checksum — verify carefully');
  }

  // Check if sending to a known contract (optional warning)
  // ... code check ...

  return { valid: true, warnings };
}
```

### 1.4 Transaction Timeout

Pending transactions expire after 15 minutes. Expired transactions are auto-rejected.

### 1.5 Replay Protection

All transactions specify:
- `chainId` — prevents cross-chain replay
- `type: 2` (EIP-1559) — modern transaction type
- `nonce` — fetched fresh from the chain before signing

---

## 2. Private Key Management

### 2.1 Storage

| Environment | Storage Method                           |
|-------------|------------------------------------------|
| Development | `.env` file (gitignored)                 |
| Production  | Environment variables on hosting platform (Railway/Render) |
| Future      | AWS KMS, Hashicorp Vault, or hardware security module |

### 2.2 Best Practices

1. **Dedicated hot wallet**: Use a wallet created ONLY for this agent. Never use personal wallets.
2. **Minimal funds**: Keep only enough ETH for expected operations + gas.
3. **Regular rotation**: Rotate keys periodically; transfer funds to new wallet.
4. **Never log keys**: Ensure private key never appears in logs, error messages, or API responses.
5. **gitignore**: `.env` MUST be in `.gitignore`.

### 2.3 Key Validation on Startup

```typescript
// backend/src/config/env.ts
function validateEnvironment() {
  if (!process.env.AGENT_PRIVATE_KEY) {
    throw new Error('AGENT_PRIVATE_KEY is not set');
  }

  // Verify key format (should be 64 hex chars, optionally prefixed with 0x)
  const key = process.env.AGENT_PRIVATE_KEY.replace('0x', '');
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('AGENT_PRIVATE_KEY has invalid format');
  }

  // Log the wallet address (NOT the key) for verification
  const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY);
  console.log(`Agent wallet address: ${wallet.address}`);
}
```

---

## 3. API Key Security

### 3.1 Environment Variables

All API keys stored as environment variables, never hardcoded:

```
ALCHEMY_API_KEY=...
ETHERSCAN_API_KEY=...
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
AGENT_PRIVATE_KEY=...
```

### 3.2 .env.example (Committed to Git)

```env
# Blockchain
ALCHEMY_API_KEY=your_alchemy_api_key
ALCHEMY_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
AGENT_PRIVATE_KEY=your_wallet_private_key

# AI
OPENAI_API_KEY=your_openai_api_key

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Optional
COVALENT_API_KEY=your_covalent_api_key
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 3.3 Rotation Plan

| Key                | Rotation Frequency  | Procedure                     |
|--------------------|---------------------|-------------------------------|
| `AGENT_PRIVATE_KEY`| Monthly             | Create new wallet, transfer funds, update env |
| `OPENAI_API_KEY`   | Quarterly           | Regenerate on OpenAI dashboard |
| `ALCHEMY_API_KEY`  | Quarterly           | Regenerate on Alchemy dashboard |
| `ETHERSCAN_API_KEY` | Quarterly          | Regenerate on Etherscan       |
| `SUPABASE_SERVICE_KEY` | On breach only  | Rotate via Supabase settings  |

---

## 4. Input Validation

### 4.1 Address Inputs

- Must be 42 characters (with `0x` prefix)
- Must pass `ethers.isAddress()` check
- Normalize to lowercase before comparison/storage

### 4.2 Transaction Hash Inputs

- Must be 66 characters (with `0x` prefix)
- Must match regex: `/^0x[0-9a-fA-F]{64}$/`

### 4.3 Amount Inputs

- Must be positive numbers
- Must have reasonable precision (max 18 decimals for ETH)
- Must not exceed transaction limits
- Must not exceed wallet balance

### 4.4 User Messages

- Max length: 4,000 characters
- Sanitize before displaying in frontend (markdown rendering with XSS protection)
- No HTML execution in user content

---

## 5. Rate Limiting

### 5.1 API Rate Limits

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,              // 30 requests per minute
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } }
});

// Chat rate limit (more restrictive)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many messages' } }
});

// Transaction rate limit (most restrictive)
const txLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Transaction limit reached' } }
});
```

### 5.2 LLM Rate Limiting

- Max 10 agent invocations per minute per user
- Max 5 tool calls per single agent run (LangChain `maxIterations`)
- Token budget: max 4,000 input tokens + 2,000 output tokens per request

---

## 6. Error Information Leakage

### 6.1 Rules

- **Never expose** internal error stack traces to the frontend
- **Never expose** API keys, private keys, or database connection strings
- **Never log** sensitive data (private keys, full user messages beyond debugging)
- Return generic error messages to the client; log detailed errors server-side

### 6.2 Error Handler Middleware

```typescript
// backend/src/middleware/errorHandler.ts
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log full error internally
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  
  // Return sanitized error to client
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.'
    }
  });
}
```

---

## 7. CORS & Network Security

- CORS whitelist only the frontend domain
- Use HTTPS in production
- Set security headers:
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Strict-Transport-Security: max-age=31536000
  ```
- Use `helmet` middleware for Express

---

## 8. Supabase Row-Level Security (RLS)

Enable RLS on all tables. Define policies so:
- Users can only read their own conversations and messages
- Users can only see their own pending transactions
- Whale watchlist is readable by all, writable by authenticated users
- The backend service role key bypasses RLS

---

## 9. Security Checklist (Pre-Launch)

- [ ] `.env` is in `.gitignore`
- [ ] No hardcoded API keys or secrets in code
- [ ] Agent private key belongs to a dedicated hot wallet with minimal funds
- [ ] Transaction confirmation gate works (tested manually)
- [ ] Transaction limits are enforced server-side
- [ ] Rate limiting is active on all endpoints
- [ ] CORS is configured to whitelist only the frontend
- [ ] Error handler does not leak internal details
- [ ] All user inputs are validated (addresses, hashes, amounts)
- [ ] RLS policies are enabled on Supabase
- [ ] `helmet` middleware is installed
- [ ] No `console.log` of sensitive data in production
- [ ] Pending transactions expire after 15 minutes
