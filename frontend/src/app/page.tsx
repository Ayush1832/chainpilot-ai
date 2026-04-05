import Link from 'next/link';
import { Zap, Wallet, Hash, Shield, Bot, TrendingUp, ArrowRight, Activity } from 'lucide-react';

const features = [
  {
    icon: Wallet,
    title: 'Wallet Intelligence',
    description: 'Deep-dive any Ethereum wallet. Get token holdings, NFTs, DeFi usage, and a behavior profile — Whale, Trader, Collector, and more.',
  },
  {
    icon: Hash,
    title: 'Transaction Explainer',
    description: 'Paste any transaction hash and get a plain-English summary. What happened, which protocol was used, how much it cost.',
  },
  {
    icon: Shield,
    title: 'Token Risk Scanner',
    description: 'Automatically detects honeypots, mint functions, blacklists, and concentration risks. Get a 1–10 risk score instantly.',
  },
  {
    icon: Bot,
    title: 'Smart Contract Auditor',
    description: 'Fetches verified source code from Etherscan and explains purpose, key functions, owner permissions, and red flags.',
  },
  {
    icon: TrendingUp,
    title: 'DeFi Strategy Advisor',
    description: 'Live yield opportunities from DeFiLlama. APY, TVL, risk level, and required assets — ranked by returns.',
  },
  {
    icon: Activity,
    title: 'Whale Tracker',
    description: 'Monitor large wallet movements in real time. Spot big buys, sells, and transfers before the market reacts.',
  },
];

const examplePrompts = [
  'Analyze wallet vitalik.eth',
  'Explain transaction 0x83b...',
  'Is this token safe? 0xdef...',
  'Where can I earn yield with ETH?',
  'Send 0.1 ETH to 0x91f...',
  'Track whale activity today',
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="border-b border-[var(--border)] sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--accent-primary)]" />
            <span className="font-semibold text-sm gradient-text">ChainPilot AI</span>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-foreground transition"
          >
            Open App
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          AI-Powered On-Chain Intelligence
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Understand Blockchain
          <br />
          <span className="gradient-text">in Plain English</span>
        </h1>

        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Analyze wallets, explain transactions, detect token risks, and execute blockchain
          operations — all through a single AI chat interface.
        </p>

        <div className="flex justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent-primary)] hover:bg-[#7d6ff0] text-white font-semibold rounded-xl transition"
          >
            <Zap className="w-4 h-4" />
            Start for Free
          </Link>
        </div>
      </section>

      {/* ── Example Prompts ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <p className="text-center text-xs text-[var(--text-secondary)] mb-4 uppercase tracking-widest">
          Just ask in natural language
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {examplePrompts.map((prompt, i) => (
            <Link
              key={i}
              href={`/chat?q=${encodeURIComponent(prompt)}`}
              className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-foreground hover:border-[rgba(108,92,231,0.4)] transition"
            >
              {prompt}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-3">Everything You Need</h2>
        <p className="text-center text-[var(--text-secondary)] mb-12">
          Eight intelligent tools, one conversation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="glass-card p-6 hover:border-[rgba(108,92,231,0.25)] transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[rgba(108,92,231,0.1)] flex items-center justify-center mb-4 group-hover:bg-[rgba(108,92,231,0.2)] transition">
                  <Icon className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="glass-card p-10 text-center">
          <Zap className="w-8 h-8 text-[var(--accent-primary)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Ready to Pilot the Chain?</h2>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Connect your wallet and start analyzing blockchain data with AI — no technical
            knowledge required.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--accent-primary)] hover:bg-[#7d6ff0] text-white font-semibold rounded-xl transition"
          >
            Launch ChainPilot AI
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-sm font-medium gradient-text">ChainPilot AI</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Powered by OpenAI · Alchemy · Etherscan · DeFiLlama
          </p>
        </div>
      </footer>
    </div>
  );
}
