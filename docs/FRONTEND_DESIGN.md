# ChainPilot AI — Frontend Design

## Overview

The frontend is a **Next.js** application (App Router) with **TailwindCSS** + **shadcn/ui** for styling and **RainbowKit** + **Wagmi** for wallet connectivity. The UI centers on a full-screen chat interface with structured data cards.

---

## Design System

### Color Palette (Dark Mode Default)

| Token               | Value         | Usage                     |
|----------------------|---------------|---------------------------|
| `--bg-primary`       | `#0a0a0f`     | Page background           |
| `--bg-secondary`     | `#12121a`     | Cards, sidebar            |
| `--bg-tertiary`      | `#1a1a2e`     | Hover states, inputs      |
| `--accent-primary`   | `#6c5ce7`     | Primary buttons, links    |
| `--accent-secondary` | `#00cec9`     | Success, positive values  |
| `--accent-warning`   | `#fdcb6e`     | Warnings, medium risk     |
| `--accent-danger`    | `#e17055`     | Errors, high risk         |
| `--text-primary`     | `#f5f5f5`     | Main text                 |
| `--text-secondary`   | `#a0a0b0`     | Muted text, labels        |
| `--text-tertiary`    | `#6c6c80`     | Timestamps, metadata      |
| `--border`           | `#2a2a3e`     | Borders, dividers         |
| `--glass`            | `rgba(255,255,255,0.05)` | Glassmorphism    |

### Typography

- **Font**: Inter (Google Fonts) — clean, modern, highly readable
- **Headings**: Inter 600 (semibold)
- **Body**: Inter 400 (regular)
- **Mono**: JetBrains Mono — for addresses, hashes, code

### Spacing Scale

`4px` base: 4, 8, 12, 16, 24, 32, 48, 64, 96

### Border Radius

- Small: `6px` (inputs, badges)
- Medium: `12px` (cards)
- Large: `16px` (modals)
- Full: `9999px` (avatars, pills)

---

## Pages

### 1. Landing Page (`/`)

```
┌──────────────────────────────────────────────┐
│  NavBar: Logo │ Features │ Docs │ [Launch →] │
├──────────────────────────────────────────────┤
│                                              │
│   ✦ ChainPilot AI                            │
│   Your AI-Powered Blockchain Assistant       │
│                                              │
│   Analyze wallets. Explain transactions.     │
│   Detect risks. Execute on-chain.            │
│                                              │
│        [ Launch App →]                       │
│                                              │
├──────────────────────────────────────────────┤
│  Feature Cards (3 columns):                  │
│  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │Wallet  │  │Token   │  │TX      │         │
│  │Analysis│  │Risk    │  │Executor│         │
│  └────────┘  └────────┘  └────────┘         │
│                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │Contract│  │DeFi    │  │Whale   │         │
│  │Explain │  │Advisor │  │Tracker │         │
│  └────────┘  └────────┘  └────────┘         │
├──────────────────────────────────────────────┤
│  Example Prompts Carousel                    │
│  "Analyze wallet 0xd8d..."                   │
│  "Is this token safe?"                       │
│  "Send 0.5 ETH to vitalik.eth"              │
├──────────────────────────────────────────────┤
│  Footer: GitHub │ Docs │ Built by [name]     │
└──────────────────────────────────────────────┘
```

**Design Notes**:
- Hero section: gradient animated background (purple → cyan)
- Feature cards: glassmorphism with hover glow effect
- Prompt carousel: typing animation showing example prompts
- CTA button: gradient border with pulse animation

---

### 2. Chat Page (`/chat`)

```
┌──────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────────────────────────────────┐│
│  │ Sidebar │  │           Chat Area                 ││
│  │         │  │                                     ││
│  │ [+ New] │  │  ┌──────────────────────────────┐   ││
│  │         │  │  │ 🤖 AI: Welcome! I'm          │   ││
│  │ Today   │  │  │ ChainPilot AI. Try:           │   ││
│  │ ├ Chat 1│  │  │ • Analyze wallet 0x...        │   ││
│  │ ├ Chat 2│  │  │ • Explain transaction 0x...   │   ││
│  │         │  │  └──────────────────────────────┘   ││
│  │ Earlier │  │                                     ││
│  │ ├ Chat 3│  │  ┌──────────────────────────────┐   ││
│  │ ├ Chat 4│  │  │ 👤 User: Analyze wallet      │   ││
│  │         │  │  │ 0xd8dA6BF2...                 │   ││
│  │         │  │  └──────────────────────────────┘   ││
│  │         │  │                                     ││
│  │         │  │  ┌──────────────────────────────┐   ││
│  │         │  │  │ 🤖 AI:                        │   ││
│  │         │  │  │ ┌──── WalletReport Card ────┐ │   ││
│  │         │  │  │ │ Behavior: DeFi Trader     │ │   ││
│  │         │  │  │ │ ETH: 1234.56              │ │   ││
│  │         │  │  │ │ Tokens: USDC, LINK, ...   │ │   ││
│  │         │  │  │ │ Risk: Medium ██████░░░░   │ │   ││
│  │         │  │  │ └───────────────────────────┘ │   ││
│  │         │  │  └──────────────────────────────┘   ││
│  │         │  │                                     ││
│  │ ┌─────┐ │  │  ┌────────────────────────────────┐ ││
│  │ │Wallet│ │  │  │ Type your message...    [Send] │ ││
│  │ │ 0x.. │ │  │  └────────────────────────────────┘ ││
│  │ └─────┘ │  └─────────────────────────────────────┘│
│  └─────────┘                                         │
└──────────────────────────────────────────────────────┘
```

**Design Notes**:
- Sidebar: 280px wide, collapsible on mobile
- Chat area: scrollable message list, auto-scroll on new message
- Messages: rounded bubble cards with role-based styling
- AI messages: may contain structured data cards (see Components below)
- Input: fixed to bottom, multiline support, Cmd+Enter to send
- Wallet connect: bottom of sidebar, shows connected address

---

## Components

### `ChatMessage.tsx`

Renders a single message (user or assistant).

**Props**:
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;               // Markdown text
  metadata?: {
    component?: string;          // 'WalletReport' | 'TransactionSummary' | 'TokenRiskCard' | 'ConfirmationPrompt'
    data?: Record<string, any>;
  };
  timestamp: string;
}
```

**Rendering logic**:
1. If `metadata.component` exists → render the corresponding structured card
2. Otherwise → render markdown content with `react-markdown`
3. User messages: right-aligned, accent color background
4. AI messages: left-aligned, secondary background

---

### `WalletReport.tsx`

Structured wallet analysis card.

**Sections**:
```
┌─────────────────────────────────────┐
│  📊 Wallet Overview                 │
│  Address: 0xd8dA...96045            │
│  ENS: vitalik.eth                   │
│  Category: 🐋 Whale                 │
├─────────────────────────────────────┤
│  💰 Holdings                        │
│  ETH     │ 1,234.56 │ $3,827,136   │
│  USDC    │ 50,000   │ $50,000      │
│  LINK    │ 10,000   │ $145,000     │
├─────────────────────────────────────┤
│  📈 Activity (Last 30 days)         │
│  Transactions: 47                   │
│  Volume: $1,250,000                 │
│  Protocols: Uniswap, Aave, Lido    │
├─────────────────────────────────────┤
│  ⚠️ Risk Level: Medium              │
│  ██████████░░░░░░░░░░ 5/10          │
└─────────────────────────────────────┘
```

---

### `TransactionSummary.tsx`

Transaction explanation card.

**Sections**:
```
┌─────────────────────────────────────┐
│  🔄 Transaction Summary             │
│                                     │
│  User swapped 1.2 ETH for           │
│  2,250 USDC on Uniswap V3          │
├─────────────────────────────────────┤
│  From: 0xabc...  → To: Uniswap V3  │
│  Gas: 0.0034 ETH ($3.40)           │
│  Block: 19654123                    │
│  Time: 2024-01-15 09:00 UTC         │
├─────────────────────────────────────┤
│  Token Transfers:                    │
│  ↑ 1.2 ETH     → Uniswap Router    │
│  ↓ 2,250 USDC  ← Uniswap Pool      │
└─────────────────────────────────────┘
```

---

### `TokenRiskCard.tsx`

Token risk analysis card.

**Sections**:
```
┌─────────────────────────────────────┐
│  🛡️ Token Risk Analysis             │
│  SomeToken (SOME)                   │
│                                     │
│  Risk Score: 8/10  🔴 HIGH RISK     │
│  ████████████████░░░░               │
├─────────────────────────────────────┤
│  ❌ Owner can mint tokens            │
│  ❌ Top wallet owns 52% of supply    │
│  ❌ Liquidity not locked             │
│  ✅ No blacklist function            │
│  ✅ Not a honeypot                   │
├─────────────────────────────────────┤
│  Recommendation: AVOID              │
│  Multiple red flags detected.       │
└─────────────────────────────────────┘
```

Color coding:
- Risk 1-3: Green badge "LOW RISK"
- Risk 4-6: Yellow badge "MEDIUM RISK"
- Risk 7-10: Red badge "HIGH RISK"

---

### `ConfirmationModal.tsx`

Transaction confirmation overlay.

```
┌─────────────────────────────────────────┐
│                                         │
│  ⚠️ Confirm Transaction                 │
│                                         │
│  Type:     Send ETH                     │
│  To:       0x91f...                     │
│  Amount:   0.5 ETH                      │
│  Gas:      ~0.002 ETH ($3.20)           │
│  Network:  Ethereum Mainnet             │
│                                         │
│  ⚠️ This action is irreversible         │
│                                         │
│  [ Cancel ]          [ ✅ Confirm ]      │
│                                         │
└─────────────────────────────────────────┘
```

- Modal backdrop with blur
- Cancel = closes modal, sends "CANCEL" to agent
- Confirm = calls `POST /api/transaction/confirm`

---

### `Sidebar.tsx`

```
┌──────────────────┐
│  ChainPilot AI   │
│                  │
│  [+ New Chat]    │
│                  │
│  Today           │
│  ├ Wallet Ana... │
│  ├ Token Risk... │
│                  │
│  Yesterday       │
│  ├ DeFi Stra... │
│  ├ Send ETH...  │
│                  │
│  ──────────────  │
│  🟢 Connected    │
│  0xd8d...045     │
│  [Disconnect]    │
└──────────────────┘
```

---

## State Management

Use React hooks (no Redux needed for this scale):

| State                   | Hook                      | Scope       |
|------------------------|---------------------------|-------------|
| Current conversation   | `useState` + `useEffect`  | Chat page   |
| Message list           | `useState`                | Chat page   |
| Streaming response     | `useState` + SSE listener | Chat page   |
| Wallet connection      | `useAccount()` (Wagmi)    | Global      |
| Conversation list      | `useState` + fetch        | Sidebar     |
| Pending confirmation   | `useState`                | Chat page   |

---

## API Client (`frontend/lib/api.ts`)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function sendMessage(message: string, conversationId?: string) {
  // Returns EventSource for streaming
}

export async function getConversations(walletAddress: string) {
  // GET /api/chat/conversations?walletAddress=...
}

export async function getConversation(conversationId: string) {
  // GET /api/chat/:conversationId
}

export async function confirmTransaction(pendingTxId: string) {
  // POST /api/transaction/confirm
}

export async function rejectTransaction(pendingTxId: string) {
  // POST /api/transaction/confirm { confirmed: false }
}
```

---

## Wagmi + RainbowKit Config (`frontend/lib/wagmi.ts`)

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ChainPilot AI',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [mainnet, sepolia],
});
```

**WalletConnect Project ID**: Get from [cloud.walletconnect.com](https://cloud.walletconnect.com/) (free)

---

## Responsive Design Breakpoints

| Breakpoint | Width       | Layout                             |
|------------|-------------|------------------------------------|
| Mobile     | < 768px     | Sidebar hidden, hamburger menu     |
| Tablet     | 768-1024px  | Sidebar overlay, chat full width   |
| Desktop    | > 1024px    | Sidebar + chat side by side        |

---

## Animations

| Element              | Animation                            | Library         |
|----------------------|--------------------------------------|-----------------|
| Message entrance     | Fade up + slide (200ms ease)         | CSS transitions |
| Typing indicator     | 3 bouncing dots                      | CSS keyframes   |
| Risk score gauge     | Fill animation on mount              | CSS transitions |
| Modal                | Backdrop blur + scale in             | CSS transitions |
| Sidebar toggle       | Slide left/right (300ms ease)        | CSS transitions |
| Wallet report load   | Skeleton → content fade              | shadcn Skeleton |
| Button hover         | Scale 1.02 + glow                    | CSS transitions |
| Feature cards (home) | Hover lift + border glow             | CSS transitions |

---

## Third-Party Libraries

| Library           | Version  | Purpose                           |
|-------------------|----------|-----------------------------------|
| next              | 14.x     | Framework                         |
| tailwindcss       | 3.x      | Utility CSS                       |
| @shadcn/ui        | latest   | Component library                 |
| @rainbow-me/rainbowkit | latest | Wallet connection modal      |
| wagmi             | 2.x      | React hooks for Ethereum          |
| viem              | 2.x      | Wagmi peer dependency             |
| react-markdown    | latest   | Render AI markdown responses      |
| lucide-react      | latest   | Icons                             |
| framer-motion     | latest   | Advanced animations (optional)    |
