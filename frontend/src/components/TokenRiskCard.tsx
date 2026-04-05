/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface TokenRiskCardProps {
  data: Record<string, any>;
}

export function TokenRiskCard({ data }: TokenRiskCardProps) {
  const score = Number(data.riskScore) || 0;
  const scoreColor = score <= 3 ? '#00cec9' : score <= 6 ? '#fdcb6e' : '#e17055';
  const scoreLabel = score <= 3 ? 'LOW RISK' : score <= 6 ? 'MEDIUM RISK' : 'HIGH RISK';
  const badgeClass = score <= 3 ? 'badge-low' : score <= 6 ? 'badge-medium' : 'badge-high';

  const recommendation = String(data.recommendation ?? 'CAUTION');
  const recColor =
    recommendation === 'SAFE' ? '#00cec9' : recommendation === 'CAUTION' ? '#fdcb6e' : '#e17055';

  const risks: any[] = Array.isArray(data.risks) ? data.risks : [];
  const topHolders: any[] = Array.isArray(data.topHolders) ? data.topHolders : [];

  return (
    <div className="bg-(--bg-secondary) border border-(--border) rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-(--border) flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-(--accent-primary)" />
          <span className="text-sm font-semibold">Token Risk Analysis</span>
        </div>
        <span className={`badge ${badgeClass}`}>{scoreLabel}</span>
      </div>

      {/* Token Info */}
      <div className="px-4 py-3 border-b border-(--border)">
        <p className="text-base font-semibold">
          {String(data.name ?? 'Unknown')}{' '}
          <span className="text-(--text-secondary)">({String(data.symbol ?? '?')})</span>
        </p>
        {data.address != null && (
          <p className="font-mono text-xs text-(--text-secondary) mt-0.5 truncate">
            {String(data.address)}
          </p>
        )}
      </div>

      {/* Risk Score */}
      <div className="px-4 py-3 border-b border-(--border)">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-(--text-secondary)">Risk Score</span>
          <span className="text-lg font-bold" style={{ color: scoreColor }}>
            {score}/10
          </span>
        </div>
        <div className="risk-bar">
          <div
            className="risk-bar-fill"
            style={{ width: `${score * 10}%`, background: scoreColor }}
          />
        </div>
      </div>

      {/* Risk Details */}
      <div className="px-4 py-3 border-b border-(--border) space-y-2">
        {data.hasMintFunction != null && (
          <RiskRow
            isRisky={Boolean(data.hasMintFunction)}
            label={data.hasMintFunction ? 'Owner can mint tokens' : 'No mint function'}
          />
        )}
        {data.hasBlacklist != null && (
          <RiskRow
            isRisky={Boolean(data.hasBlacklist)}
            label={data.hasBlacklist ? 'Blacklist function detected' : 'No blacklist function'}
          />
        )}
        {data.isHoneypot != null && (
          <RiskRow
            isRisky={Boolean(data.isHoneypot)}
            label={data.isHoneypot ? 'Potential honeypot' : 'Not a honeypot'}
          />
        )}
        {data.liquidityLocked != null && (
          <RiskRow
            isRisky={!Boolean(data.liquidityLocked)}
            label={data.liquidityLocked ? 'Liquidity is locked' : 'Liquidity NOT locked'}
          />
        )}
        {risks.map((risk: any, i: number) => (
          <RiskRow key={i} isRisky={risk.severity !== 'low'} label={risk.description} />
        ))}
      </div>

      {/* Top Holders */}
      {topHolders.length > 0 && (
        <div className="px-4 py-3 border-b border-(--border)">
          <p className="text-xs text-(--text-secondary) mb-2">Top Holders</p>
          {topHolders.slice(0, 3).map((holder: any, i: number) => (
            <div key={i} className="flex justify-between text-xs mb-1">
              <span className="font-mono text-(--text-secondary) truncate mr-2">
                {String(holder.address ?? '').slice(0, 10)}...{String(holder.address ?? '').slice(-6)}
              </span>
              <span
                className="font-medium"
                style={{ color: Number(holder.percentage) > 30 ? '#e17055' : '#a0a0b0' }}
              >
                {Number(holder.percentage).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: recColor }} />
          <span className="text-sm font-semibold" style={{ color: recColor }}>
            Recommendation: {recommendation}
          </span>
        </div>
      </div>
    </div>
  );
}

function RiskRow({ isRisky, label }: { isRisky: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {isRisky ? (
        <XCircle className="w-4 h-4 text-[#e17055] shrink-0" />
      ) : (
        <CheckCircle className="w-4 h-4 text-(--accent-primary) shrink-0" />
      )}
      <span className={isRisky ? 'text-foreground' : 'text-(--text-secondary)'}>
        {label}
      </span>
    </div>
  );
}
