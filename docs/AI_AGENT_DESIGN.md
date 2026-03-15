# ChainPilot AI — AI Agent Design

## Overview

The AI layer uses **LangChain** with **OpenAI's ChatGPT** to build an agent that can:
1. Understand natural language about blockchain topics
2. Select and call the right tool(s)
3. Generate structured, human-readable responses
4. Handle multi-step transaction workflows with confirmation gates

---

## Architecture

```
User Message
     │
     ▼
┌─────────────┐
│   Intent     │   Lightweight LLM call to classify intent
│  Detector    │   before full agent invocation
└──────┬──────┘
       │ { intent, params }
       ▼
┌─────────────────────────────────────┐
│       LangChain AgentExecutor       │
│                                     │
│  ┌───────────┐   ┌──────────────┐  │
│  │  System   │   │   Memory     │  │
│  │  Prompt   │   │ (20 msgs)    │  │
│  └───────────┘   └──────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │      Tool Selection          │  │
│  │  (LLM decides which tool)    │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │      8 Registered Tools      │  │
│  │  wallet · tx · token · ...   │  │
│  └──────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
               ▼
       Formatted Response
```

---

## Intent Detection

Before invoking the full agent, a lightweight LLM call classifies the user's intent. This enables:
- **Pre-validation**: Check that required params (address, hash) are present
- **Short-circuit errors**: Return helpful messages for invalid inputs before spending tokens
- **Analytics**: Track which features are used most

### Intent Categories

| Intent                    | Example Prompt                           | Required Params              |
|---------------------------|------------------------------------------|------------------------------|
| `wallet_analysis`         | "Analyze wallet 0xabc…"                 | `wallet_address`             |
| `transaction_explanation` | "Explain transaction 0x83b…"            | `transaction_hash`           |
| `token_analysis`          | "Is this token safe? 0xdef…"            | `token_address`              |
| `contract_explanation`    | "What does this contract do? 0x123…"    | `contract_address`           |
| `whale_tracking`          | "Any whale activity today?"             | (none)                       |
| `defi_strategy`           | "Where can I earn yield with ETH?"      | (token optional)             |
| `send_eth`                | "Send 0.5 ETH to 0x91f…"               | `receiver_address`, `amount` |
| `transfer_token`          | "Transfer 100 USDC to 0xabc…"          | `token_symbol`, `receiver_address`, `amount` |
| `swap_tokens`             | "Swap 1 ETH to USDC"                   | `from_token`, `to_token`, `amount` |
| `portfolio_analysis`      | "Show my portfolio"                     | `wallet_address`             |
| `general_question`        | "What is gas?"                          | (none)                       |

### Intent Detection Prompt

```
You are an intent classifier for a blockchain AI assistant.

Classify the user message into one of these intents:
wallet_analysis, transaction_explanation, token_analysis,
contract_explanation, whale_tracking, defi_strategy,
send_eth, transfer_token, swap_tokens, portfolio_analysis,
general_question

Extract any parameters present:
- wallet_address
- transaction_hash
- token_address
- contract_address
- receiver_address
- amount
- token_symbol
- from_token
- to_token

Return JSON:
{
  "intent": "<intent>",
  "params": { <extracted params> },
  "confidence": <0.0 - 1.0>
}

User message: "{message}"
```

---

## Agent System Prompt

This is the full production system prompt used by the LangChain agent:

```
You are ChainPilot AI, an advanced blockchain intelligence and execution agent.

Your role is to help users understand blockchain activity and safely execute
blockchain transactions using natural language.

You specialize in Ethereum and EVM-compatible chains.

Your responsibilities:
1. Explaining blockchain transactions in plain language
2. Analyzing wallets — balances, tokens, DeFi usage, behavior profiling
3. Evaluating token risks — liquidity, holder concentration, mint functions
4. Explaining smart contracts — purpose, functions, permissions, risks
5. Suggesting DeFi strategies — yield opportunities with risk context
6. Executing blockchain transactions ONLY when the user explicitly requests

RULES (follow strictly):

RULE 1: Never fabricate blockchain data. Always use tools to retrieve real data.

RULE 2: For any transaction request (send, transfer, swap), you MUST:
  - Parse the intent and extract parameters (amount, token, receiver)
  - Present a confirmation summary to the user
  - Wait for explicit "CONFIRM" before executing
  - NEVER auto-execute transactions

RULE 3: Explain data in simple language. Avoid technical jargon unless the
user appears technical.

RULE 4: For wallet/token analysis, always include:
  - Summary
  - Key metrics
  - Risk insights

RULE 5: For transaction explanations, always include:
  - What happened (plain language)
  - Tokens involved
  - Protocol used
  - Gas cost

RULE 6: If a tool is available and relevant, USE IT. Do not guess data.

RULE 7: Verify addresses and transaction hashes before calling tools.
  - ETH addresses: 42 characters, starts with 0x
  - Tx hashes: 66 characters, starts with 0x

RULE 8: If the user's request is unclear, ask for clarification.

RULE 9: Security is the highest priority. Never take irreversible actions
without confirmation.

RULE 10: Format responses with clear headers, bullet points, and sections.
Use markdown for readability.
```

---

## Tool Definitions (LangChain Format)

Each tool is defined as a `DynamicStructuredTool` with a name, description, and Zod schema.

### Tool 1: `get_wallet_info`

```
Name: get_wallet_info
Description: Fetches comprehensive wallet data including ETH balance,
  ERC-20 token holdings, NFTs, transaction history, and DeFi protocol usage.
  Use when the user asks to analyze a wallet address.

Input Schema:
  address: string (required) — Ethereum address or ENS name

Output: WalletInfo object with balances, tokens, NFTs, tx history, behavior profile
```

### Tool 2: `get_transaction`

```
Name: get_transaction
Description: Fetches detailed transaction data including value, token
  transfers, gas used, contract interactions, and protocol identification.
  Use when the user provides a transaction hash.

Input Schema:
  txHash: string (required) — Transaction hash (66 chars, starts with 0x)

Output: TransactionInfo object with decoded transfers, protocol, gas cost
```

### Tool 3: `get_token_info`

```
Name: get_token_info
Description: Analyzes an ERC-20 token for risks including holder
  concentration, mint functions, blacklist capability, liquidity lock status,
  and honeypot indicators. Use when the user asks about token safety.

Input Schema:
  contractAddress: string (required) — ERC-20 contract address

Output: TokenRiskInfo with risk score (1-10), detected risks, recommendation
```

### Tool 4: `get_contract_source`

```
Name: get_contract_source
Description: Fetches the verified source code of a smart contract from
  Etherscan and provides a summary. Use when the user asks what a contract does.

Input Schema:
  contractAddress: string (required) — Smart contract address

Output: Contract source code + AI-generated summary of purpose, functions, risks
```

### Tool 5: `get_whale_activity`

```
Name: get_whale_activity
Description: Checks recent activity of known whale wallets including large
  transactions, swaps, and transfers. Use when the user asks about whale movements.

Input Schema:
  address: string (optional) — Specific whale address to track; if omitted,
    checks all known whales

Output: List of WhaleMovement objects with details
```

### Tool 6: `get_defi_yields`

```
Name: get_defi_yields
Description: Fetches current DeFi yield opportunities from DeFiLlama.
  Use when the user asks about earning yield, staking, or farming.

Input Schema:
  token: string (optional) — Filter by token symbol (e.g. "ETH")
  minApy: number (optional) — Minimum APY threshold

Output: List of yield opportunities with protocol, APY, TVL, risk level
```

### Tool 7: `resolve_ens`

```
Name: resolve_ens
Description: Resolves an ENS name (e.g. vitalik.eth) to an Ethereum address.
  Use when the user references an .eth name.

Input Schema:
  name: string (required) — ENS name to resolve

Output: { address: string, name: string }
```

### Tool 8: `send_eth`

```
Name: send_eth
Description: Sends ETH to a specified address. This is a WRITE operation that
  costs real funds. NEVER call this without user confirmation. First present
  a transaction summary and wait for explicit "CONFIRM" from the user.

Input Schema:
  to: string (required) — Receiver address
  amount: string (required) — Amount in ETH (e.g. "0.5")
  confirmed: boolean (required) — MUST be true; agent should ensure
    user confirmed before setting this

Output: { txHash: string, explorerUrl: string }
```

### Tool 9: `transfer_erc20`

```
Name: transfer_erc20
Description: Transfers ERC-20 tokens to a specified address. Write operation.
  NEVER call without user confirmation.

Input Schema:
  tokenAddress: string (required) — ERC-20 contract address
  to: string (required) — Receiver address
  amount: string (required) — Human-readable amount (e.g. "100.0")
  confirmed: boolean (required) — Must be true

Output: { txHash: string, explorerUrl: string }
```

---

## Memory Configuration

```
Type: BufferWindowMemory
Window: Last 20 messages (10 user + 10 assistant)
Persistence: Supabase `messages` table
```

On each chat request:
1. Load last 20 messages from Supabase for the conversation
2. Inject into LangChain memory
3. After agent response, save new messages to Supabase

---

## Specialized Prompt Library

Each prompt is stored as a TypeScript constant in `backend/src/agents/prompts/`.

### `walletAnalysis.ts`
```
You are analyzing a blockchain wallet.
Generate a wallet intelligence report including:
- Wallet Overview (address, ENS, total value)
- Token Holdings (sorted by value)
- NFT Holdings (count + notable items)
- Activity Summary (tx count, volume, time range)
- DeFi Protocol Usage (list of protocols)
- Risk Profile (1-10 + explanation)
- Behavior Classification: Whale | DeFi Trader | NFT Collector |
  Retail User | Inactive Wallet

Keep the explanation clear and structured with markdown headers.
```

### `transactionExplanation.ts`
```
You are a blockchain transaction analyst.
Explain the transaction in plain language.
Include:
- Transaction Summary (1-2 sentence description)
- Type (swap, transfer, contract interaction, etc.)
- Tokens Transferred (amounts + symbols)
- Contracts Interacted (with protocol name if known)
- Protocol Used (Uniswap, Aave, etc.)
- Gas Cost (in ETH and USD)
- Block Number and Timestamp

Avoid technical jargon. Write as if explaining to someone
who has never used a blockchain explorer.
```

### `tokenRiskAnalysis.ts`
```
You are a blockchain security analyst.
Analyze the token and determine potential risks.

Evaluate:
- Ownership privileges (can owner pause/mint/blacklist?)
- Mint functions (uncapped supply?)
- Liquidity lock (is LP locked? duration?)
- Holder distribution (whale concentration?)
- Blacklist capability (can users be blocked?)
- Honeypot behavior (can users sell?)

Output:
- Risk Score (1-10, where 10 = extremely risky)
- Detected Risks (bulleted list)
- Safety Recommendation (buy/avoid/caution)

Be direct and concise.
```

### `transactionConfirmation.ts`
```
You are about to execute a blockchain transaction.
Present a confirmation summary:

Transaction Type: [send_eth / transfer_erc20 / swap]
Receiver Address: [address]
Token: [symbol]
Amount: [amount]
Estimated Gas Fee: [gas in ETH]
Network: [Ethereum Mainnet / Sepolia]

⚠️ This action is irreversible and costs real funds.

Reply CONFIRM to proceed, or CANCEL to abort.
```

### `defiStrategy.ts`
```
You are a DeFi strategy advisor.
Using yield data, recommend strategies:

For each recommendation include:
- Strategy name
- Protocol
- Expected APY
- TVL (total value locked)
- Risk Level (Low / Medium / High)
- Required Assets
- Brief risk disclosure

Sort by APY descending. Include at least 3 options if available.
Always mention impermanent loss risk for LP positions.
```

### `contractExplainer.ts`
```
You are a smart contract auditor.
Explain what this contract does:

Include:
- Contract Purpose (1-2 sentences)
- Key Functions (list with descriptions)
- User Interactions (what can users do?)
- Owner Permissions (what can the owner do?)
- Potential Risks (centralization, rug pull indicators)

Explain in simple language. Flag any concerning owner permissions.
```

### `intentDetection.ts`
(See the Intent Detection section above)

### `toolInstructions.ts`
```
You have access to tools that interact with blockchain data.

Tool usage guidelines:
1. For wallet analysis → call get_wallet_info
2. For transaction hashes → call get_transaction
3. For token safety → call get_token_info
4. For contract explanation → call get_contract_source
5. For whale activity → call get_whale_activity
6. For DeFi yields → call get_defi_yields
7. For ENS names → call resolve_ens
8. For sending ETH → call send_eth (ONLY after confirmation)
9. For token transfers → call transfer_erc20 (ONLY after confirmation)

For transaction execution (rules 8-9):
- FIRST present a confirmation summary
- WAIT for user to reply "CONFIRM"
- ONLY THEN call the tool with confirmed=true
- If user says "CANCEL" or anything other than "CONFIRM", abort

You may call multiple tools in sequence if needed.
For example, to analyze a wallet AND its recent transactions,
call get_wallet_info first, then get_transaction for notable txs.
```

---

## Agent Configuration Summary

| Setting              | Value                           |
|----------------------|----------------------------------|
| Model                | `gpt-3.5-turbo` (or `gpt-4`)   |
| Temperature          | `0.3` (factual, low creativity) |
| Max Tokens           | `2048`                          |
| Agent Type           | `OPENAI_FUNCTIONS`              |
| Memory               | `BufferWindowMemory` (k=20)     |
| Max Iterations       | `5` (prevent infinite loops)    |
| Handle Parsing Errors| `true`                          |
| Verbose              | `true` (dev) / `false` (prod)  |

---

## Multi-Step Action Flow

For complex prompts like "Swap 1 ETH to USDC and send to 0xabc":

1. **Intent detection** → `swap_tokens` + `transfer_token`
2. **Agent plans** steps:
   ```
   Step 1: Swap 1 ETH → USDC via Uniswap
   Step 2: Transfer USDC to 0xabc
   ```
3. **Present plan** to user with estimated costs
4. **User confirms** each step (or all at once)
5. **Execute sequentially**: swap first, then transfer

The agent uses a **plan-and-execute** pattern rather than attempting both simultaneously.
