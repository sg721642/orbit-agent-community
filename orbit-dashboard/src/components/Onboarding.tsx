import React, { useState, useRef } from 'react';
import { PROFILE_TEMPLATES, CHAPTERS } from '../mockData';
import { matchMember } from '../api';
import type { OnboardingResult } from '../types';

const CHAPTER_COLORS: Record<string, string> = {
  Delhi: '#6366f1',
  Bangalore: '#10b981',
  Pune: '#f59e0b',
  Hyderabad: '#06b6d4',
  Mumbai: '#8b5cf6',
};

const CHAPTER_EMOJIS: Record<string, string> = {
  Delhi: '🏛️', Bangalore: '🌿', Pune: '🏔️', Hyderabad: '🌊', Mumbai: '🌆',
};

// ─── Confetti Canvas ──────────────────────────────────────────────────────
function fireConfetti() {
  // Simple CSS-only confetti effect using div elements
  const canvas = document.createElement('div');
  canvas.id = 'confetti-layer';
  canvas.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden;
  `;
  document.body.appendChild(canvas);

  const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 6;
    const x = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const dur = Math.random() * 1.5 + 1.5;
    const rotate = Math.random() * 360;

    piece.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      opacity: 0;
      animation: confetti-fall ${dur}s ${delay}s ease-in forwards;
      transform: rotate(${rotate}deg);
    `;
    canvas.appendChild(piece);
  }

  // Inject animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    canvas.remove();
    style.remove();
  }, 4000);
}

// ─── Result Card ──────────────────────────────────────────────────────────
function ResultCard({ result }: { result: OnboardingResult }) {
  const color = CHAPTER_COLORS[result.chapter] || '#6366f1';
  const emoji = CHAPTER_EMOJIS[result.chapter] || '🏙️';

  return (
    <div
      className="glass p-6 animate-fade-in"
      style={{ borderColor: `${color}44`, boxShadow: `0 0 30px ${color}22` }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ background: `${color}22` }}
        >
          {emoji}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Chapter Assigned
          </p>
          <h3 className="text-2xl font-bold mt-0.5" style={{ color }}>
            {result.chapter}
          </h3>
        </div>
        <span className="badge badge-green ml-auto">✓ MATCHED</span>
      </div>
      <div
        className="p-4 rounded-xl text-sm leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Welcome Message
        </p>
        <p style={{ color: 'var(--text-primary)' }}>"{result.welcome_message}"</p>
      </div>
    </div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────
interface OnboardingProps {
  simulated: boolean;
}

export default function Onboarding({ simulated }: OnboardingProps) {
  const [profile, setProfile] = useState('');
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const SIMULATED_CHAPTERS: Record<string, OnboardingResult> = {
    'ml': { chapter: 'Bangalore', welcome_message: 'Welcome to ORBIT Bangalore! Your ML and LLM expertise is exactly what our community needs. We can\'t wait to see you at our next AI meetup — you\'re going to love it here.' },
    'web3': { chapter: 'Mumbai', welcome_message: 'Welcome to ORBIT Mumbai! The fintech and Web3 scene here is thriving, and your experience in DeFi will be invaluable. We have a great network of builders and investors waiting to connect with you.' },
    'devops': { chapter: 'Delhi', welcome_message: 'Welcome to ORBIT Delhi! Platform engineering and DevOps are at the heart of our Delhi chapter. Your Kubernetes expertise will make you a star in our community.' },
    'design': { chapter: 'Pune', welcome_message: 'Welcome to ORBIT Pune! Our design-forward community in Pune will love your UI/UX perspective. We have a vibrant creative tech scene here with regular design jams.' },
    'data': { chapter: 'Hyderabad', welcome_message: 'Welcome to ORBIT Hyderabad! Data engineering is booming here, and your Spark expertise will make you a key voice in our community.' },
  };

  const getSimulatedResult = (text: string): OnboardingResult => {
    const lower = text.toLowerCase();
    if (lower.includes('ml') || lower.includes('machine') || lower.includes('llm') || lower.includes('agent')) {
      return SIMULATED_CHAPTERS.ml;
    }
    if (lower.includes('web3') || lower.includes('defi') || lower.includes('blockchain') || lower.includes('crypto')) {
      return SIMULATED_CHAPTERS.web3;
    }
    if (lower.includes('devops') || lower.includes('kubernetes') || lower.includes('cloud') || lower.includes('infra')) {
      return SIMULATED_CHAPTERS.devops;
    }
    if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('figma')) {
      return SIMULATED_CHAPTERS.design;
    }
    if (lower.includes('data') || lower.includes('spark') || lower.includes('pipeline')) {
      return SIMULATED_CHAPTERS.data;
    }
    const chapter = CHAPTERS[Math.floor(Math.random() * CHAPTERS.length)];
    return {
      chapter,
      welcome_message: `Welcome to ORBIT ${chapter}! We're thrilled to have you join our vibrant tech community. Looking forward to seeing you at our next meetup!`,
    };
  };

  const handleSubmit = async () => {
    if (!profile.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res: OnboardingResult;
      if (simulated) {
        await new Promise(r => setTimeout(r, 1800));
        res = getSimulatedResult(profile);
      } else {
        res = await matchMember(profile);
      }
      setResult(res);
      fireConfetti();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try simulated mode.');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (text: string) => {
    setProfile(text);
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Member Onboarding</h2>
          <p className="section-subtitle">
            The onboarding-agent matches new members to the best-fit chapter
          </p>
        </div>
        {simulated && <span className="badge badge-amber">⚡ Simulated</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          {/* Template Buttons */}
          <div className="glass p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Quick Templates
            </p>
            <div className="flex flex-wrap gap-2">
              {PROFILE_TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t.text)}
                  className="btn btn-ghost btn-sm"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Member Bio / Interests
            </label>
            <textarea
              ref={textareaRef}
              className="input"
              placeholder="Describe your background, skills, and what you're looking to get from the community..."
              value={profile}
              onChange={e => setProfile(e.target.value)}
              rows={6}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {profile.length} characters — aim for at least 50 for best results
            </p>
          </div>

          {/* Submit */}
          <button
            className="btn btn-primary w-full btn-lg"
            onClick={handleSubmit}
            disabled={loading || !profile.trim()}
            style={{ opacity: loading || !profile.trim() ? 0.6 : 1, cursor: loading || !profile.trim() ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <>
                <span className="animate-spin">⟳</span> Matching to chapter…
              </>
            ) : (
              <>🔍 Find My Chapter</>
            )}
          </button>

          {error && (
            <div
              className="p-4 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Result Panel */}
        <div className="flex flex-col">
          {result ? (
            <ResultCard result={result} />
          ) : loading ? (
            <div className="glass flex flex-col items-center justify-center p-10 text-center h-full gap-4">
              <div
                className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/60 animate-spin"
              />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Analyzing profile…</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  The onboarding-agent is finding your best chapter match
                </p>
              </div>
            </div>
          ) : (
            <div className="glass flex flex-col items-center justify-center p-10 text-center h-full gap-4 opacity-60">
              <span className="text-5xl">🎯</span>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Paste your bio or pick a template
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  The AI will assign you to one of 5 city chapters
                </p>
              </div>
              {/* Chapter Preview */}
              <div className="w-full grid grid-cols-5 gap-2 mt-2">
                {CHAPTERS.map(ch => (
                  <div
                    key={ch}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl"
                    style={{ background: `${CHAPTER_COLORS[ch]}11` }}
                  >
                    <span className="text-lg">{CHAPTER_EMOJIS[ch]}</span>
                    <span className="text-xs" style={{ color: CHAPTER_COLORS[ch] }}>{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
