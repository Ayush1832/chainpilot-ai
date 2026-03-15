'use client';

import {
  Wallet,
  TrendingUp,
  Shield,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';

interface WalletReportProps {
  data: Record<string, unknown>;
}

export function WalletReport({ data }: WalletReportProps) {
  const riskColors: Record<string, string> = {
    Low: '#00cec9',
    Medium: '#fdcb6e',
    High: '#e17055',
    Critical: '#d63031',
  };

  const riskLevel = String(data.riskLevel || 'Medium');
  const riskColor = riskColors[riskLevel] || '#fdcb6e';

  const copyAddress = () => {
    navigator.clipboard.writeText(String(data.address || ''));
  };

  return (
    <div className="bg-(--bg-secondary) border border-(--border) rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-(--border) flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-(--accent-primary)" />
          <span className="text-sm font-semibold">Wallet Overview</span>
        </div>
        <span className="badge" style={{ background: `${riskColor}20`, color: riskColor }}>
          {riskLevel} Risk
        </span>
      </div>

      {/* Address */}
      <div className="px-4 py-3 border-b border-(--border)">
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--text-secondary)">Address</span>
          <button onClick={copyAddress} className="p-0.5 hover:bg-(--bg-tertiary) rounded transition">
            <Copy className="w-3 h-3 text-(--text-secondary)" />
          </button>
        </div>
        <p className="font-mono text-sm text-foreground mt-0.5 truncate">
          {String(data.address)}
        </p>
        {Boolean(data.ensName) && (
          <p className="text-sm text-(--text-secondary)">{String(data.ensName)}</p>
        )}
        {Boolean(data.behaviorProfile) && (
          <p className="text-xs text-(--text-secondary) mt-1">
            Category: <span className="text-foreground">{String(data.behaviorProfile)}</span>
          </p>
        )}
      </div>

      {/* Holdings */}
      <div className="px-4 py-3 border-b border-(--border)">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-(--accent-primary)" />
          <span className="text-xs font-semibold text-(--text-secondary)">Holdings</span>
        </div>

        <div className="space-y-2">
          {/* ETH Balance */}
          <div className="flex justify-between items-center">
            <span className="text-sm">ETH</span>
            <div className="text-right">
              <span className="text-sm font-medium">{String(data.ethBalance || '0')}</span>
              {data.ethBalanceUsd != null && (
                <span className="text-xs text-(--text-secondary) ml-2">
                  ${Number(data.ethBalanceUsd).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Token list */}
          {(data.tokens as Array<{symbol?: string, name?: string, balance: string, usdValue?: number}> || []).slice(0, 5).map((token, i: number) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-sm text-(--text-secondary)">{token.symbol || token.name}</span>
              <div className="text-right">
                <span className="text-sm">{token.balance}</span>
                {token.usdValue != null && (
                  <span className="text-xs text-(--text-secondary) ml-2">
                    ${Number(token.usdValue).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NFTs */}
      {(data.nfts as unknown[])?.length > 0 && (
        <div className="px-4 py-3 border-b border-(--border)">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-3.5 h-3.5 text-(--accent-primary)" />
            <span className="text-xs font-semibold text-(--text-secondary)">
              NFTs ({(data.nfts as unknown[])?.length || 0})
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(data.nfts as Array<{name?: string, collection?: string}> || []).slice(0, 5).map((nft, i: number) => (
              <span key={i} className="text-xs bg-(--bg-secondary) px-2 py-1 rounded">
                {nft.name || nft.collection}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="px-4 py-3 border-b border-(--border)">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-(--accent-primary)" />
          <span className="text-xs font-semibold text-(--text-secondary)">Activity</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-(--text-secondary)">Transactions</p>
            <p className="text-sm font-medium">{String(data.transactionCount || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-(--text-secondary)">DeFi Protocols</p>
            <p className="text-sm font-medium">{(data.defiProtocols as unknown[])?.length || 0}</p>
          </div>
        </div>
        {(data.defiProtocols as unknown[])?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(data.defiProtocols as string[]).map((p: string, i: number) => (
              <span key={i} className="text-xs bg-(--bg-secondary)/10 text-(--text-secondary) px-2 py-0.5 rounded-full">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Risk Bar */}
      <div className="px-4 py-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-(--text-secondary)">Risk Level</span>
          <span className="text-xs font-medium" style={{ color: riskColor }}>
            {riskLevel}
          </span>
        </div>
        <div className="risk-bar">
          <div
            className="risk-bar-fill"
            style={{
              width: `${riskLevel === 'Low' ? 25 : riskLevel === 'Medium' ? 50 : riskLevel === 'High' ? 75 : 100}%`,
              background: riskColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
