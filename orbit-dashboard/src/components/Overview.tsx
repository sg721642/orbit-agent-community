import {
  MOCK_STATS, MOCK_VC, MOCK_CHAPTER_BREAKDOWN
} from '../mockData';
import type { CommunityStats, VerifiableCredential } from '../types';

// ─── Chapter Health Bar ───────────────────────────────────────────────────
function ChapterBar({
  name, count, total,
}: { name: string; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{name}</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {count} Members · {pct}%
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: '#FF6B00' }}
        />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, isPositive, delay,
}: {
  label: string;
  value: number | string;
  icon: string;
  isPositive?: boolean;
  delay?: string;
}) {
  return (
    <div
      className={`glass glass-hover stat-card p-6 animate-fade-in ${delay || ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        {isPositive ? (
          <span className="text-xs font-bold font-mono" style={{ color: '#FF6B00' }}>
            ↑ ACTIVE
          </span>
        ) : (
          <span className="text-xs font-bold font-mono" style={{ color: '#C41E3A' }}>
            WARN
          </span>
        )}
      </div>
      <div className="flex flex-col mt-1">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {value}
          </span>
          {isPositive && (
            <span className="text-2xl font-bold ml-1" style={{ color: '#FF6B00' }}>
              ↑
            </span>
          )}
        </div>
        <p className="text-xs font-bold tracking-widest uppercase mt-3" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Health Score Ring ────────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);

  // Math for the tick mark coordinate on the score position
  const angle = -Math.PI / 2 + (2 * Math.PI * score) / 100;
  const r1 = 48;
  const r2 = 60;
  const x1 = 70 + r1 * Math.cos(angle);
  const y1 = 70 + r1 * Math.sin(angle);
  const x2 = 70 + r2 * Math.cos(angle);
  const y2 = 70 + r2 * Math.sin(angle);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="health-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FFB347" />
          </linearGradient>
        </defs>
        {/* Background Track */}
        <circle cx="70" cy="70" r={r} fill="none" stroke="#2A2A28" strokeWidth="6" />
        {/* Active Gradient Dial */}
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="url(#health-grad)" strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Editorial Tick Mark */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F5F0E8" strokeWidth="2.5" strokeLinecap="round" />
        
        <text x="70" y="68" textAnchor="middle" fill="#FF6B00" fontSize="28" fontWeight="700" fontFamily="Space Grotesk">
          {score}
        </text>
        <text x="70" y="86" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="700" letterSpacing="0.1em" fontFamily="Space Grotesk">
          HEALTH
        </text>
      </svg>
      <div className="text-center font-display">
        <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#FF6B00' }}>
          {score >= 80 ? 'Excellent' : score >= 60 ? 'Satisfactory' : 'Critical'}
        </p>
        <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Community Index
        </p>
      </div>
    </div>
  );
}

// ─── VC Panel ─────────────────────────────────────────────────────────────
function VCPanel({ vc }: { vc: VerifiableCredential }) {
  return (
    <div className="glass p-6 animate-fade-in stagger-4">
      <div className="flex items-center justify-between mb-4 border-b border-[#2A2A28] pb-3">
        <div>
          <h3 className="font-bold font-display text-sm uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            🔐 Verifiable Credential Receipt
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Signed audit receipt generated by insights-agent
          </p>
        </div>
        <span className="badge badge-green">VERIFIED</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-xs font-mono">
        {[
          ['Issuer', vc.issuer],
          ['Subject', vc.subject],
          ['Algorithm', vc.algorithm],
          ['Issued', new Date(vc.issued_at).toLocaleString()],
        ].map(([k, v]) => (
          <div key={k} className="p-3 bg-[#0D0D0B] border border-[#2A2A28] rounded">
            <p className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>{k}</p>
            <p className="mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{v}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2A2A28] pb-4">
        <div>
          <h2 className="section-title">Community Overview</h2>
          <p className="section-subtitle">Real-time operations intelligence compiled by insights-agent</p>
        </div>
        {simulated && (
          <span className="badge badge-amber">⚡ Sandbox</span>
        )}
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Total Members" value={stats.total_members}
          isPositive delay="stagger-1" />
        <StatCard icon="🏙️" label="Active Chapters" value={stats.active_chapters}
          isPositive delay="stagger-2" />
        <StatCard icon="📅" label="Upcoming Events" value={stats.total_events}
          isPositive delay="stagger-3" />
        <StatCard icon="🚩" label="Flagged Content" value={stats.flagged_posts}
          delay="stagger-4" />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health + Metrics */}
        <div className="glass p-6 flex flex-col items-center justify-between gap-6 animate-fade-in stagger-1">
          <HealthRing score={stats.health_score} />
          <div className="w-full space-y-3 pt-3 border-t border-[#2A2A28]">
            {[
              { label: 'Growth Rate', value: stats.growth_rate, unit: '%', color: '#22C55E' },
              { label: 'Engagement Rate', value: stats.engagement_rate, unit: '%', color: '#FF6B00' },
              { label: 'Churn Risk', value: stats.churn_risk, unit: '%', color: '#C41E3A' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="flex justify-between items-center text-xs font-mono">
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="font-bold" style={{ color }}>
                  {value}{unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chapter Breakdown */}
        <div className="glass p-6 lg:col-span-2 animate-fade-in stagger-2">
          <h3 className="font-bold mb-5 font-display text-xs uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
            Chapter Distribution
          </h3>
          <div className="space-y-4">
            {Object.entries(chapters).map(([name, count]) => (
              <ChapterBar
                key={name} name={name} count={count} total={total}
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
