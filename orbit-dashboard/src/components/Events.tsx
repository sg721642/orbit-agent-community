import { useState } from 'react';
import { MOCK_MEMBERS, MOCK_EVENTS } from '../mockData';
import { recommendEvents } from '../api';
import type { Member, Event } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  Workshop: '#FF6B00',
  Meetup: '#22C55E',
  Conference: '#A09880',
  Hackathon: '#FF6B00',
  Webinar: '#F5F0E8',
};

// ─── Event Card ───────────────────────────────────────────────────────────
function EventCard({ event, index }: { event: Event; index: number }) {
  const color = CATEGORY_COLORS[event.category] || '#FF6B00';
  const matchPct = event.matchScore ? Math.round(event.matchScore * 100) : null;

  return (
    <div
      className={`glass glass-hover p-5 animate-fade-in`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded"
          style={{ background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' }}
        >
          {event.category}
        </span>
        {matchPct && (
          <div className="flex items-center gap-1.5 font-mono">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-xs font-bold" style={{ color }}>
              {matchPct}% MATCH
            </span>
          </div>
        )}
      </div>

      <h3 className="font-bold font-display text-base leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>
        {event.title}
      </h3>

      {event.matchReason && (
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {event.matchReason}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs font-mono border-t border-[#2A2A28] pt-3" style={{ color: 'var(--text-secondary)' }}>
        <span>📅 {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span>📍 {event.venue || event.chapter}</span>
        {event.speaker && <span>🎤 {event.speaker}</span>}
      </div>

      {matchPct && (
        <div className="mt-3">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${matchPct}%`, background: '#FF6B00' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Member Selector Card ─────────────────────────────────────────────────
function MemberChip({
  member, selected, onClick,
}: {
  member: Member; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass glass-hover p-3 text-left transition-all duration-200 w-full"
      style={{
        borderColor: selected ? '#FF6B00' : undefined,
        background: selected ? 'rgba(255, 107, 0, 0.05)' : undefined,
        borderLeft: selected ? '3px solid #FF6B00' : undefined,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'rgba(255, 107, 0, 0.15)', color: '#FF6B00', borderRadius: '4px' }}
        >
          {member.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {member.name}
          </p>
          <p className="text-xs font-mono text-neutral-400" style={{ color: 'var(--text-secondary)' }}>
            {member.chapter}
          </p>
        </div>
      </div>
      {selected && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {member.interests.map(i => (
            <span key={i} className="badge badge-indigo text-[10px]" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
              {i}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Main Events Component ────────────────────────────────────────────────
interface EventsProps {
  simulated: boolean;
}

export default function Events({ simulated }: EventsProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const getSimulatedEvents = (member: Member): Event[] => {
    return MOCK_EVENTS
      .filter(e => e.chapter === member.chapter || Math.random() > 0.5)
      .slice(0, 3)
      .map(e => ({
        ...e,
        matchScore: 0.75 + Math.random() * 0.24,
        matchReason: `Recommended based on your interest in ${member.interests.join(', ')}.`,
      }))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  };

  const handleFetch = async () => {
    if (!selectedMember) return;
    setLoading(true);
    setError(null);
    setEvents([]);
    setFetched(false);

    try {
      if (simulated) {
        await new Promise(r => setTimeout(r, 1500));
        setEvents(getSimulatedEvents(selectedMember));
      } else {
        const res = await recommendEvents(
          selectedMember.id,
          selectedMember.chapter,
          selectedMember.interests
        );
        setEvents(res.events.map(e => ({
          id: e.id,
          title: e.title,
          chapter: e.chapter,
          date: e.date,
          category: e.category,
          matchScore: e.match_score,
          matchReason: e.match_reason,
          speaker: e.speaker,
          venue: e.venue,
        })));
      }
      setFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2A2A28] pb-4">
        <div>
          <h2 className="section-title">Event Recommendations</h2>
          <p className="section-subtitle">
            Interest-based matching matrix calculated by event-agent engines
          </p>
        </div>
        {simulated && <span className="badge badge-amber">⚡ Sandbox</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Selector */}
        <div className="space-y-3">
          <h3 className="font-bold font-display text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            Select Member Profile
          </h3>
          <div className="space-y-2">
            {MOCK_MEMBERS.map(m => (
              <MemberChip
                key={m.id}
                member={m}
                selected={selectedMember?.id === m.id}
                onClick={() => {
                  setSelectedMember(m);
                  setEvents([]);
                  setFetched(false);
                  setError(null);
                }}
              />
            ))}
          </div>

          <button
            className="btn btn-primary w-full mt-2"
            onClick={handleFetch}
            disabled={!selectedMember || loading}
            style={{ opacity: !selectedMember || loading ? 0.6 : 1 }}
          >
            {loading ? (
              <>Running Match Matrix…</>
            ) : (
              <>🎯 Get Recommendations</>
            )}
          </button>

          {error && (
            <div
              className="p-3 rounded text-xs font-mono uppercase tracking-wider"
              style={{ background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.2)', color: '#C41E3A' }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <div className="glass flex flex-col items-center justify-center p-12 text-center gap-4">
              <div className="w-12 h-12 rounded border-4 border-t-[#FF6B00] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div>
                <p className="font-bold font-display text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Calculating Match Metrics…
                </p>
                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                  Correlating member interest parameters with region schedule for {selectedMember?.chapter}
                </p>
              </div>
            </div>
          )}

          {!loading && fetched && events.length === 0 && (
            <div className="glass p-10 text-center font-mono text-xs">
              <p style={{ color: 'var(--text-secondary)' }}>No matches resolved for this profile.</p>
            </div>
          )}

          {!loading && events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}

          {!loading && !fetched && (
            <div className="glass flex flex-col items-center justify-center p-12 text-center gap-4 opacity-60">
              <span className="text-5xl">🗓️</span>
              <div>
                <p className="font-bold font-display text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Select profile & execute matcher
                </p>
                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                  Matches upcoming chapter workshops and meetups with personal interest matrices
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
