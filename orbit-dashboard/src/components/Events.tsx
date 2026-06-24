import React, { useState } from 'react';
import { MOCK_MEMBERS, MOCK_EVENTS } from '../mockData';
import { recommendEvents } from '../api';
import type { Member, Event } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  Workshop: '#6366f1',
  Meetup: '#10b981',
  Conference: '#f59e0b',
  Hackathon: '#ec4899',
  Webinar: '#06b6d4',
};

// ─── Event Card ───────────────────────────────────────────────────────────
function EventCard({ event, index }: { event: Event; index: number }) {
  const color = CATEGORY_COLORS[event.category] || '#6366f1';
  const matchPct = event.matchScore ? Math.round(event.matchScore * 100) : null;

  return (
    <div
      className={`glass glass-hover p-5 animate-fade-in`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          {event.category}
        </span>
        {matchPct && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-sm font-bold" style={{ color }}>
              {matchPct}% match
            </span>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-base leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>
        {event.title}
      </h3>

      {event.matchReason && (
        <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {event.matchReason}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>📅 {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span>📍 {event.venue || event.chapter}</span>
        {event.speaker && <span>🎤 {event.speaker}</span>}
      </div>

      {matchPct && (
        <div className="mt-3">
          <div className="progress-bar" style={{ height: '4px' }}>
            <div
              className="progress-fill"
              style={{ width: `${matchPct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
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
        borderColor: selected ? 'var(--accent-primary)' : undefined,
        boxShadow: selected ? '0 0 0 2px rgba(99,102,241,0.3)' : undefined,
        background: selected ? 'rgba(99,102,241,0.1)' : undefined,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
        >
          {member.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {member.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {member.chapter}
          </p>
        </div>
      </div>
      {selected && (
        <div className="flex flex-wrap gap-1 mt-2">
          {member.interests.map(i => (
            <span key={i} className="badge badge-indigo text-xs" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Event Recommendations</h2>
          <p className="section-subtitle">
            The event-agent personalises meetup suggestions based on member interests
          </p>
        </div>
        {simulated && <span className="badge badge-amber">⚡ Simulated</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Selector */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Select a Member
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
              <><span className="animate-spin">⟳</span> Finding events…</>
            ) : (
              <>🎯 Get Recommendations</>
            )}
          </button>

          {error && (
            <div
              className="p-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="lg:col-span-2 space-y-3">
          {loading && (
            <div className="glass flex flex-col items-center justify-center p-12 text-center gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-t-emerald-500 border-r-emerald-500/30 border-b-emerald-500/10 border-l-emerald-500/60 animate-spin" />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Fetching personalised events…
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Matching interests with upcoming meetups in {selectedMember?.chapter}
                </p>
              </div>
            </div>
          )}

          {!loading && fetched && events.length === 0 && (
            <div className="glass p-10 text-center">
              <p style={{ color: 'var(--text-secondary)' }}>No events found for this member.</p>
            </div>
          )}

          {!loading && events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}

          {!loading && !fetched && (
            <div className="glass flex flex-col items-center justify-center p-12 text-center gap-4 opacity-60">
              <span className="text-5xl">🗓️</span>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Select a member and get recommendations
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  The event-agent will match upcoming meetups based on their interests and chapter
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
