import React, { useState, useEffect } from 'react';
import Overview from './components/Overview';
import Onboarding from './components/Onboarding';
import Moderation from './components/Moderation';
import Events from './components/Events';
import type { TabId } from './types';

// ─── Tab Config ───────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: string; description: string }[] = [
  { id: 'overview',   label: 'Overview',   icon: '🌐', description: 'Community health & metrics' },
  { id: 'onboarding', label: 'Onboarding', icon: '🎯', description: 'Member chapter matching'   },
  { id: 'moderation', label: 'Moderation', icon: '🛡️', description: 'HITL content review'       },
  { id: 'events',     label: 'Events',     icon: '🗓️', description: 'Personalised recommendations' },
];

// ─── Orbit Logo ───────────────────────────────────────────────────────────
function OrbitLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-9 h-9 flex-shrink-0">
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'var(--accent-primary)', opacity: 0.4, animation: 'spin 8s linear infinite' }}
        />
        {/* Middle ring */}
        <div
          className="absolute inset-1 rounded-full border-2"
          style={{ borderColor: 'var(--accent-secondary)', opacity: 0.6, animation: 'spin 5s linear infinite reverse' }}
        />
        {/* Core dot */}
        <div
          className="absolute inset-3 rounded-full"
          style={{ background: 'var(--accent-primary)' }}
        />
      </div>
      <div>
        <span className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          ORBIT
        </span>
        <span
          className="text-xs block -mt-0.5 font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          Agent{'{A}'}thon 2026
        </span>
      </div>
    </div>
  );
}

// ─── Backend Status ───────────────────────────────────────────────────────
function BackendStatus({ online }: { online: boolean | null }) {
  if (online === null) return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
      Checking backend…
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: online ? '#34d399' : '#f87171' }}>
      <div
        className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`}
        style={online ? { animation: 'pulse 2s ease-in-out infinite' } : {}}
      />
      {online ? 'Backend online' : 'Simulated mode'}
    </div>
  );
}

// ─── Mode Toggle ──────────────────────────────────────────────────────────
function ModeToggle({
  simulated, onToggle,
}: {
  simulated: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200"
      style={{
        background: simulated ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
        border: `1px solid ${simulated ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
        color: simulated ? '#fbbf24' : '#34d399',
      }}
      title={simulated ? 'Switch to live backend' : 'Switch to simulated mode'}
    >
      <span className="text-sm">{simulated ? '⚡' : '🌐'}</span>
      <span className="text-xs font-semibold hidden sm:block">
        {simulated ? 'Simulated' : 'Live'}
      </span>
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [simulated, setSimulated] = useState(true); // default simulated until backend confirmed

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/v1/memory/list', { method: 'POST', signal: AbortSignal.timeout(3000) });
        setBackendOnline(res.ok);
        setSimulated(!res.ok);
      } catch {
        setBackendOnline(false);
        setSimulated(true);
      }
    };
    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative" style={{ zIndex: 1 }}>
      {/* ─── Top Navigation Bar ─── */}
      <nav
        className="sticky top-0 z-50 px-4 sm:px-6"
        style={{
          background: 'rgba(8,11,20,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4 h-16">
          {/* Logo */}
          <OrbitLogo />

          {/* Tab Pills */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto ml-4 py-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 whitespace-nowrap flex-shrink-0"
                style={{
                  background: activeTab === tab.id
                    ? 'rgba(99,102,241,0.15)'
                    : 'transparent',
                  border: activeTab === tab.id
                    ? '1px solid rgba(99,102,241,0.3)'
                    : '1px solid transparent',
                  color: activeTab === tab.id
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                }}
              >
                <span>{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <BackendStatus online={backendOnline} />
            <ModeToggle
              simulated={simulated}
              onToggle={() => setSimulated(s => !s)}
            />
          </div>
        </div>
      </nav>

      {/* ─── Banner if simulated ─── */}
      {simulated && (
        <div
          className="px-4 sm:px-6 py-2.5 text-center text-sm"
          style={{
            background: 'rgba(245,158,11,0.08)',
            borderBottom: '1px solid rgba(245,158,11,0.15)',
            color: '#fbbf24',
          }}
        >
          ⚡ Running in <strong>Simulated Mode</strong> — backend offline.{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            Start the Python agents and refresh, or click the mode toggle to switch.
          </span>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'overview'   && <Overview   simulated={simulated} />}
        {activeTab === 'onboarding' && <Onboarding simulated={simulated} />}
        {activeTab === 'moderation' && <Moderation simulated={simulated} />}
        {activeTab === 'events'     && <Events     simulated={simulated} />}
      </main>

      {/* ─── Footer ─── */}
      <footer
        className="mt-16 px-6 py-6 text-center text-sm"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <span>ORBIT</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <span>Built for Agent{'{A}'}thon 2026</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <span>Powered by AgentField + Google Gemini</span>
        </div>
        <p>Multi-agent community operations platform · 4 AI Agents · Human-in-the-Loop · Verifiable Credentials</p>
      </footer>
    </div>
  );
}
