# ChainPilot AI — API Design

## Base URL

```
Development:  http://localhost:4000/api
Production:   https://api.chainpilot.ai/api
```

## Authentication

All requests optionally include a wallet address header for user identification:

```
X-Wallet-Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

For MVP, no JWT/session auth is required. The backend uses Supabase service role key internally.

---

## Endpoints

### 1. Chat

#### `POST /api/chat`

Send a message to the AI agent.

**Request Body**:
```json
{
  "message": "Analyze wallet 0xabc...",
  "conversationId": "uuid-optional",
  "walletAddress": "0xabc..."
}
```

**Response** (streamed via Server-Sent Events):
```
data: {"type": "text", "content": "Analyzing wallet..."}
data: {"type": "text", "content": "## Wallet Overview\n..."}
data: {"type": "structured", "component": "WalletReport", "data": { ... }}
data: {"type": "confirmation", "txId": "uuid", "details": { ... }}
data: {"type": "done", "conversationId": "uuid"}
```

**Response Types**:

| `type`         | Description                                    | Frontend Action              |
|----------------|------------------------------------------------|------------------------------|
| `text`         | Markdown text chunk                            | Append to message            |
| `structured`   | Structured data for a component                | Render specific card         |
| `confirmation` | Transaction awaiting confirmation              | Show ConfirmationModal       |
| `tool_call`    | Tool invocation notification (optional)        | Show loading indicator       |
| `error`        | Error message                                  | Display error toast          |
| `done`         | Stream complete                                | Close stream                 |

**Errors**:
- `400` — missing `message` field
- `500` — agent execution error

---

#### `GET /api/chat/:conversationId`

Fetch conversation history.

**Response**:
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Wallet Analysis",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Analyze wallet 0xabc...",
      "metadata": {},
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "## Wallet Overview\n...",
      "metadata": {
        "component": "WalletReport",
        "data": { ... }
      },
      "createdAt": "2024-01-15T10:30:05Z"
    }
  ]
}
```

---

#### `GET /api/chat/conversations`

List all conversations for a user.

**Query Params**: `walletAddress` (required)

**Response**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Wallet Analysis",
      "updatedAt": "2024-01-15T10:30:00Z",
      "messageCount": 5
    }
  ]
}
```

---

### 2. Wallet

#### `GET /api/wallet/:address`

Direct wallet analysis (bypasses chat).

**Path Params**: `address` — Ethereum address or ENS name

**Response**:
```json
{
  "address": "0xabc...",
  "ensName": "vitalik.eth",
  "ethBalance": "1234.56",
  "tokens": [
    {
      "symbol": "USDC",
      "name": "USD Coin",
      "balance": "50000.00",
      "contractAddress": "0xA0b8...",
      "decimals": 6,
      "usdValue": 50000.00
    }
  ],
  "nfts": [
    {
      "name": "CryptoPunk #1234",
      "collection": "CryptoPunks",
      "tokenId": "1234",
      "imageUrl": "https://..."
    }
  ],
  "transactionCount": 1523,
  "recentTransactions": [
    {
      "hash": "0x...",
      "type": "swap",
      "protocol": "Uniswap V3",
      "value": "1.2 ETH → 2250 USDC",
      "timestamp": "2024-01-15T09:00:00Z"
    }
  ],
  "defiProtocols": ["Uniswap", "Aave", "Curve"],
  "behaviorProfile": "Active DeFi Trader",
  "riskLevel": "Medium",
  "analysis": "This wallet is an active DeFi trader..."
}
```

**Errors**:
- `400` — invalid address format
- `404` — address not found / no activity

---

### 3. Transaction

#### `GET /api/transaction/:hash`

Explain a transaction.

**Path Params**: `hash` — transaction hash

**Response**:
```json
{
  "hash": "0x83b...",
  "blockNumber": 19654123,
  "from": "0xabc...",
  "to": "0xdef...",
  "value": "1.2",
  "gasUsed": "154000",
  "gasCostEth": "0.0034",
  "gasCostUsd": 3.40,
  "status": "success",
  "tokenTransfers": [
    {
      "token": "USDC",
      "from": "0xdef...",
      "to": "0xabc...",
      "amount": "2250.00"
    }
  ],
  "contractInteracted": "0x68b3...",
  "protocol": "Uniswap V3",
  "methodName": "exactInputSingle",
  "summary": "User swapped 1.2 ETH for 2250 USDC on Uniswap V3.",
  "timestamp": "2024-01-15T09:00:00Z"
}
```

---

#### `POST /api/transaction/confirm`

Confirm and broadcast a pending transaction.

**Request Body**:
```json
{
  "pendingTxId": "uuid",
  "confirmed": true
}
```

**Response (success)**:
```json
{
  "status": "broadcast",
  "txHash": "0x...",
  "explorerUrl": "https://etherscan.io/tx/0x..."
}
```

**Response (rejected)**:
```json
{
  "status": "rejected",
  "message": "Transaction cancelled by user."
}
```

---

### 4. Token

#### `GET /api/token/:address`

Analyze token risk.

**Path Params**: `address` — ERC-20 contract address

**Response**:
```json
{
  "address": "0x...",
  "name": "SomeToken",
  "symbol": "SOME",
  "decimals": 18,
  "totalSupply": "1000000000",
  "riskScore": 8,
  "risks": [
    {
      "category": "ownership",
      "severity": "high",
      "description": "Owner can mint unlimited tokens"
    },
    {
      "category": "concentration",
      "severity": "high",
      "description": "Top wallet holds 52% of supply"
    },
    {
      "category": "liquidity",
      "severity": "medium",
      "description": "Liquidity is not locked"
    }
  ],
  "holderCount": 1234,
  "topHolders": [
    { "address": "0x...", "percentage": 52.3 },
    { "address": "0x...", "percentage": 8.1 }
  ],
  "liquidityLocked": false,
  "hasMintFunction": true,
  "hasBlacklist": false,
  "isHoneypot": false,
  "recommendation": "HIGH RISK — avoid investing"
}
```

---

### 5. DeFi

#### `GET /api/defi/yields`

Fetch current DeFi yield opportunities.

**Query Params**:
- `token` (optional) — filter by token symbol (e.g. `ETH`, `USDC`)
- `minApy` (optional) — minimum APY threshold
- `chain` (optional) — chain filter (default: `ethereum`)

**Response**:
```json
{
  "yields": [
    {
      "protocol": "Lido",
      "pool": "stETH",
      "token": "ETH",
      "apy": 3.7,
      "tvl": 15200000000,
      "riskLevel": "Low",
      "description": "Liquid staking on Lido"
    },
    {
      "protocol": "Uniswap V3",
      "pool": "ETH-USDC 0.3%",
      "token": "ETH/USDC",
      "apy": 9.5,
      "tvl": 450000000,
      "riskLevel": "Medium",
      "description": "Concentrated liquidity provision"
    }
  ]
}
```

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "The provided address is not a valid Ethereum address.",
    "details": {}
  }
}
```

**Standard Error Codes**:

| Code                   | HTTP Status | Description                              |
|------------------------|-------------|------------------------------------------|
| `INVALID_ADDRESS`      | 400         | Malformed Ethereum address               |
| `INVALID_TX_HASH`      | 400         | Malformed transaction hash               |
| `MISSING_FIELD`        | 400         | Required request field missing           |
| `NOT_FOUND`            | 404         | Address/tx/token not found               |
| `RATE_LIMITED`          | 429         | Too many requests                        |
| `EXTERNAL_API_ERROR`   | 502         | Upstream API failure                     |
| `AGENT_ERROR`          | 500         | AI agent execution error                 |
| `TX_ALREADY_CONFIRMED` | 409         | Transaction was already confirmed        |
| `TX_EXPIRED`           | 410         | Pending transaction timed out            |

---

## Rate Limiting

| Tier     | Limit                |
|----------|----------------------|
| Default  | 30 requests / minute |
| Chat     | 10 messages / minute |

Implemented via `express-rate-limit` middleware.

---

## CORS Configuration

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',          // local dev
    'https://chainpilot.ai',         // production
    'https://www.chainpilot.ai'
  ],
  credentials: true
};
```
