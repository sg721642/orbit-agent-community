import { useState, useEffect } from 'react';
import Overview from './components/Overview';
import Onboarding from './components/Onboarding';
import Moderation from './components/Moderation';
import Events from './components/Events';
import type { TabId } from './types';

// ─── Tab Config ───────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; description: string }[] = [
  { id: 'overview',   label: 'Overview',   description: 'Community health & metrics' },
  { id: 'onboarding', label: 'Onboarding', description: 'Member chapter matching'   },
  { id: 'moderation', label: 'Moderation', description: 'HITL content review'       },
  { id: 'events',     label: 'Events',     description: 'Personalised recommendations' },
];

// ─── Orbit Logo ───────────────────────────────────────────────────────────
function OrbitLogo() {
  return (
    <div className="flex items-center gap-2.5 font-display">
      <span className="text-2xl font-bold" style={{ color: '#FF6B00' }}>
        ◎
      </span>
      <div>
        <span className="text-lg font-bold tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>
          ORBIT
        </span>
        <span
          className="text-[10px] block -mt-1 font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          Terminal v1.0
        </span>
      </div>
    </div>
  );
}

// ─── Backend Status ───────────────────────────────────────────────────────
function BackendStatus({ online }: { online: boolean | null }) {
  if (online === null) return (
    <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
      <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
      CHECKING...
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: online ? '#22C55E' : '#FF6B00' }}>
      <div
        className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-orange-500'}`}
      />
      {online ? 'ONLINE' : 'OFFLINE'}
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
      className="flex items-center gap-2 px-3 py-1.5 transition-all duration-200 font-display font-bold uppercase tracking-wider text-xs"
      style={{
        background: simulated ? 'rgba(255,107,0,0.1)' : 'rgba(34,197,94,0.1)',
        border: `1px solid ${simulated ? 'rgba(255,107,0,0.2)' : 'rgba(34,197,94,0.2)'}`,
        color: simulated ? '#FF6B00' : '#22C55E',
        borderRadius: '6px',
      }}
      title={simulated ? 'Switch to live backend' : 'Switch to simulated mode'}
    >
      <span>{simulated ? 'SIMULATED' : 'LIVE'}</span>
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [simulated, setSimulated] = useState(true);

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
          background: '#0D0D0B',
          borderBottom: '1px solid #2A2A28',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          {/* Logo */}
          <OrbitLogo />

          {/* Tab Underline Links */}
          <div className="flex-1 flex items-center justify-center gap-6 h-full overflow-x-auto px-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center h-16 px-1 border-b-2 transition-all duration-150 whitespace-nowrap flex-shrink-0 font-display text-xs tracking-widest uppercase font-bold"
                style={{
                  background: 'transparent',
                  borderColor: activeTab === tab.id ? '#FF6B00' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: '0px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 flex-shrink-0">
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
          className="px-4 sm:px-6 py-2.5 text-center text-xs font-mono uppercase tracking-wider"
          style={{
            background: 'rgba(255,107,0,0.08)',
            borderBottom: '1px solid rgba(255,107,0,0.15)',
            color: '#FF6B00',
          }}
        >
          ▲ Simulated Mode Enabled — Python Backend Offline. All operations are local sandboxes.
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
        className="mt-16 border-t px-6 py-8 bg-[#0D0D0B]"
        style={{ borderColor: '#2A2A28', color: 'var(--text-secondary)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="text-center md:text-left">
            Built for Agent{'{A}'}thon 2026 · Autonomous Operations for India's Tech Communities
          </div>
          <div className="text-center md:text-right">
            AgentField · Gemini · React
          </div>
        </div>
      </footer>
    </div>
  );
}
