# ChainPilot AI — Transaction Execution Design

## Overview

Transaction execution is the most security-critical feature. The system supports:
1. **Send ETH** — native ETH transfers
2. **Transfer ERC-20** — token transfers
3. **Swap Tokens** — DEX swaps (future, via Uniswap Router)

All transactions require **explicit user confirmation** before broadcast.

---

## Transaction Lifecycle

```
User Prompt ("Send 0.5 ETH to 0x91f...")
     │
     ▼
┌─────────────────┐
│  Intent Detect   │  → intent: send_eth, amount: 0.5, to: 0x91f...
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate Params │  → check address format, amount > 0, sufficient balance
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Estimate Gas    │  → provider.estimateGas() + provider.getFeeData()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Preview   │  → create pending_transactions row (status: awaiting_confirmation)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Present to User │  → ConfirmationModal with tx details + gas estimate
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
 CONFIRM   CANCEL
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ Sign & │  │ Update │
│ Send   │  │ status │
│ tx     │  │  →     │
│        │  │rejected│
└───┬────┘  └────────┘
    │
    ▼
┌─────────────────┐
│  Wait for Receipt│  → tx.wait()
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
 SUCCESS    FAIL
    │         │
    ▼         ▼
Update      Update
status →    status →
 mined       failed
```

---

## Wallet Configuration

The backend uses a **server-side wallet** for transaction execution. This is a hot wallet managed by the agent.

```typescript
// backend/src/config/wallet.ts

import { ethers } from 'ethers';

const CHAIN_CONFIG = {
  mainnet: {
    rpcUrl: process.env.ALCHEMY_RPC_URL,
    chainId: 1,
    explorerUrl: 'https://etherscan.io'
  },
  sepolia: {
    rpcUrl: process.env.ALCHEMY_SEPOLIA_RPC_URL,
    chainId: 11155111,
    explorerUrl: 'https://sepolia.etherscan.io'
  }
};

function getProvider(network: 'mainnet' | 'sepolia' = 'mainnet') {
  return new ethers.JsonRpcProvider(CHAIN_CONFIG[network].rpcUrl);
}

function getWallet(network: 'mainnet' | 'sepolia' = 'mainnet') {
  const provider = getProvider(network);
  return new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);
}
```

> ⚠️ **SECURITY**: The `AGENT_PRIVATE_KEY` must belong to a **dedicated hot wallet** with minimal funds. Never use a wallet holding significant assets.

---

## Send ETH — Implementation Spec

### Function: `sendETH(to: string, amount: string, network?: string)`

**Steps**:
1. **Validate** `to` address with `ethers.isAddress(to)`
2. **Resolve ENS** if `to` contains `.eth`: `provider.resolveName(to)`
3. **Parse amount**: `ethers.parseEther(amount)`
4. **Check balance**: `wallet.provider.getBalance(wallet.address)` ≥ `value + estimatedGas`
5. **Estimate gas**: `provider.estimateGas({ to, value })`
6. **Get fee data**: `provider.getFeeData()` → `maxFeePerGas`, `maxPriorityFeePerGas`
7. **Build transaction**:
   ```typescript
   const tx = {
     to: resolvedAddress,
     value: ethers.parseEther(amount),
     maxFeePerGas: feeData.maxFeePerGas,
     maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
     gasLimit: estimatedGas * 120n / 100n, // 20% buffer
     chainId: CHAIN_CONFIG[network].chainId,
     type: 2 // EIP-1559
   };
   ```
8. **Return preview** (do NOT send yet):
   ```json
   {
     "pendingTxId": "uuid",
     "type": "send_eth",
     "to": "0x91f...",
     "amount": "0.5",
     "estimatedGas": "0.002",
     "estimatedGasUsd": "$3.20",
     "network": "ethereum"
   }
   ```
9. **On confirmation**: `wallet.sendTransaction(tx)` → `tx.wait()`
10. **Return result**:
    ```json
    {
      "txHash": "0x...",
      "explorerUrl": "https://etherscan.io/tx/0x...",
      "status": "mined",
      "blockNumber": 19654123
    }
    ```

---

## Transfer ERC-20 — Implementation Spec

### Function: `transferERC20(tokenAddress: string, to: string, amount: string, network?: string)`

**Steps**:
1. **Validate** both addresses
2. **Resolve ENS** for `to` if needed
3. **Get token metadata**: call `decimals()`, `symbol()`, `name()` on contract
4. **Parse amount**: `ethers.parseUnits(amount, decimals)`
5. **Check token balance**: call `balanceOf(wallet.address)` ≥ parsedAmount
6. **Build contract call**:
   ```typescript
   const ERC20_ABI = [
     'function transfer(address to, uint256 amount) returns (bool)',
     'function balanceOf(address) view returns (uint256)',
     'function decimals() view returns (uint8)',
     'function symbol() view returns (string)',
     'function name() view returns (string)'
   ];

   const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
   ```
7. **Estimate gas**: `contract.transfer.estimateGas(to, parsedAmount)`
8. **Return preview** (same format as sendETH)
9. **On confirmation**: `contract.transfer(to, parsedAmount)` → `tx.wait()`
10. **Return result** with tx hash and explorer URL

---

## Swap Tokens (Future) — Design Spec

### Function: `swapTokens(fromToken: string, toToken: string, amount: string)`

This uses the **Uniswap V3 SwapRouter**.

**Steps**:
1. Approve token spending: `fromToken.approve(swapRouterAddress, amount)`
2. Build swap params:
   ```typescript
   const params = {
     tokenIn: fromTokenAddress,
     tokenOut: toTokenAddress,
     fee: 3000, // 0.3% pool
     recipient: wallet.address,
     deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
     amountIn: parsedAmount,
     amountOutMinimum: minAmountOut, // from quote
     sqrtPriceLimitX96: 0
   };
   ```
3. Call `swapRouter.exactInputSingle(params)`
4. Wait for receipt

> [!IMPORTANT]
> Swap functionality should be built **after** send/transfer are working and tested. It involves more complexity (approvals, slippage, pool selection).

---

## Multi-Step Transaction Plans

For prompts like "Swap 1 ETH to USDC and send to 0xabc":

1. Agent identifies 2 steps: swap + transfer
2. Agent presents the **plan** to user:
   ```
   Transaction Plan:
   
   Step 1: Swap 1 ETH → USDC (via Uniswap V3)
     Estimated output: ~2,250 USDC
     Gas: ~0.005 ETH
   
   Step 2: Transfer 2,250 USDC to 0xabc...
     Gas: ~0.001 ETH
   
   Total estimated gas: ~0.006 ETH ($9.60)
   
   Reply CONFIRM to execute both steps.
   ```
3. On confirmation, execute **sequentially** (step 1, wait for receipt, step 2)
4. Report results of each step

---

## Confirmation Safeguards

### Rule: No Auto-Execution

The `transactionExecutor` tool checks for a `confirmed` boolean parameter. The agent MUST:
1. First call the tool with `confirmed: false` to generate a preview
2. Present the preview to the user
3. Wait for "CONFIRM" response
4. ONLY then call the tool with `confirmed: true`

### Server-Side Protection

```typescript
// In the send_eth tool handler
async function sendEth({ to, amount, confirmed }: SendEthParams) {
  if (!confirmed) {
    // Return preview only
    const preview = await buildTransactionPreview(to, amount);
    return { requiresConfirmation: true, preview };
  }

  // Execute the transaction
  const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amount) });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}
```

### Transaction Timeout

Pending transactions expire after **15 minutes**. If the user doesn't confirm within this window, the transaction is automatically rejected.

```sql
-- Cron job or scheduled task
UPDATE pending_transactions
SET status = 'rejected', error_message = 'Transaction expired (15 min timeout)'
WHERE status = 'awaiting_confirmation'
AND created_at < now() - interval '15 minutes';
```

---

## Error Handling

| Error                        | Handling                                          |
|------------------------------|---------------------------------------------------|
| Invalid address              | Return validation error before preview            |
| Insufficient balance         | Show current balance + required amount            |
| Gas estimation failure       | Retry with manual gas limit; if fails, show error |
| Nonce too low                | Fetch latest nonce and retry                      |
| Transaction reverted         | Parse revert reason, explain to user              |
| Network error                | Retry up to 3 times with exponential backoff      |
| User rejected in wallet      | Show "cancelled by user" message                  |

---

## Testing Strategy

1. **Unit tests**: Mock ethers.js provider and wallet; verify:
   - Address validation works
   - Gas estimation is called correctly
   - Confirmation gate works (confirmed=false returns preview)
   - Transaction is NOT sent when confirmed=false

2. **Integration tests on Sepolia**:
   - Send 0.001 Sepolia ETH between test wallets
   - Transfer test ERC-20 tokens
   - Verify tx hash appears on Sepolia Etherscan
   - Test insufficient balance error handling

3. **Never test on mainnet** — always use Sepolia testnet with test ETH from faucets
