import React from 'react';
import {
  MOCK_STATS, MOCK_VC, MOCK_CHAPTER_BREAKDOWN
} from '../mockData';
import type { CommunityStats, VerifiableCredential } from '../types';

// ─── Chapter Health Bar ───────────────────────────────────────────────────
function ChapterBar({
  name, count, total, color,
}: { name: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
        <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          {count} members · {pct}%
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  label, value, unit, icon, color, delay,
}: {
  label: string;
  value: number | string;
  unit?: string;
  icon: string;
  color: string;
  delay?: string;
}) {
  return (
    <div
      className={`glass glass-hover stat-card p-5 animate-fade-in ${delay || ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          LIVE
        </span>
      </div>
      <div className="mt-1">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </span>
          {unit && (
            <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Health Score Ring ────────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="70" y="68" textAnchor="middle" fill={color} fontSize="26" fontWeight="700" fontFamily="Outfit">
          {score}
        </text>
        <text x="70" y="86" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="Outfit">
          HEALTH
        </text>
      </svg>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color }}>
          {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Attention'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Community Score</p>
      </div>
    </div>
  );
}

// ─── VC Panel ─────────────────────────────────────────────────────────────
function VCPanel({ vc }: { vc: VerifiableCredential }) {
  return (
    <div className="glass p-5 animate-fade-in stagger-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            🔐 Verifiable Credential
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Signed audit receipt from insights-agent
          </p>
        </div>
        <span className="badge badge-green">VERIFIED</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        {[
          ['Issuer', vc.issuer],
          ['Subject', vc.subject],
          ['Algorithm', vc.algorithm],
          ['Issued', new Date(vc.issued_at).toLocaleString()],
        ].map(([k, v]) => (
          <div key={k} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ color: 'var(--text-muted)' }}>{k}</p>
            <p className="font-mono mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="code-block text-xs">
        {JSON.stringify(
          { claims: vc.claims, signature: vc.signature.slice(0, 32) + '…' },
          null, 2
        )}
      </div>
    </div>
  );
}

// ─── Main Overview Component ──────────────────────────────────────────────
interface OverviewProps {
  simulated: boolean;
}

export default function Overview({ simulated }: OverviewProps) {
  const stats: CommunityStats = MOCK_STATS;
  const vc: VerifiableCredential = MOCK_VC;
  const chapters = MOCK_CHAPTER_BREAKDOWN;
  const total = Object.values(chapters).reduce((a, b) => a + b, 0);

  const chapterColors = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Community Overview</h2>
          <p className="section-subtitle">Real-time health metrics from the insights-agent</p>
        </div>
        {simulated && (
          <span className="badge badge-amber">⚡ Simulated Mode</span>
        )}
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Total Members" value={stats.total_members}
          color="#6366f1" delay="stagger-1" />
        <StatCard icon="🏙️" label="Active Chapters" value={stats.active_chapters}
          color="#10b981" delay="stagger-2" />
        <StatCard icon="📅" label="Upcoming Events" value={stats.total_events}
          color="#06b6d4" delay="stagger-3" />
        <StatCard icon="🚩" label="Flagged Posts" value={stats.flagged_posts}
          color="#ef4444" delay="stagger-4" />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health + Metrics */}
        <div className="glass p-6 flex flex-col items-center gap-4 animate-fade-in stagger-1">
          <HealthRing score={stats.health_score} />
          <div className="w-full space-y-3">
            {[
              { label: 'Growth Rate', value: stats.growth_rate, unit: '%', color: '#10b981' },
              { label: 'Engagement Rate', value: stats.engagement_rate, unit: '%', color: '#6366f1' },
              { label: 'Churn Risk', value: stats.churn_risk, unit: '%', color: '#ef4444' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-sm font-semibold font-mono" style={{ color }}>
                  {value}{unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chapter Breakdown */}
        <div className="glass p-6 lg:col-span-2 animate-fade-in stagger-2">
          <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
            Chapter Breakdown
          </h3>
          <div className="space-y-4">
            {Object.entries(chapters).map(([name, count], i) => (
              <ChapterBar
                key={name} name={name} count={count} total={total}
                color={chapterColors[i % chapterColors.length]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Verifiable Credential */}
      <VCPanel vc={vc} />
    </div>
  );
}
