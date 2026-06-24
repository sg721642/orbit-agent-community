import React, { useState } from 'react';
import { MOCK_POSTS } from '../mockData';
import { reviewContent, submitApproval } from '../api';
import type { Post } from '../types';

// ─── Confidence Meter ─────────────────────────────────────────────────────
function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="progress-bar flex-1" style={{ height: '4px' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────
function PostCard({
  post, simulated, onApprove, onReject,
}: {
  post: Post;
  simulated: boolean;
  onApprove: (post: Post) => void;
  onReject: (post: Post) => void;
}) {
  const statusConfig = {
    approved:  { label: 'Allowed', badge: 'badge-green', icon: '✓' },
    rejected:  { label: 'Blocked', badge: 'badge-red',   icon: '✕' },
    paused:    { label: 'Awaiting Human', badge: 'badge-amber', icon: '⏸' },
    pending:   { label: 'Processing', badge: 'badge-cyan',  icon: '⟳' },
  };

  const cfg = statusConfig[post.status];
  const isHITL = post.status === 'paused';

  return (
    <div
      className={`glass p-5 transition-all duration-300 ${isHITL ? 'hitl-card' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
          >
            {post.author.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {post.author}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {post.chapter} · {new Date(post.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <span className={`badge ${cfg.badge}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
        {post.content}
      </p>

      {post.confidence !== undefined && (
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            AI Confidence
          </p>
          <ConfidenceMeter value={post.confidence} />
        </div>
      )}

      {/* HITL Action Buttons */}
      {isHITL && (
        <div
          className="mt-4 p-4 rounded-xl flex flex-col gap-3"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span className="pulse-dot amber" />
            <span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
              Human Approval Required
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            The moderation-agent flagged this post as borderline (confidence {' '}
            {post.confidence !== undefined ? Math.round(post.confidence * 100) : '?'}%). 
            Your decision will resume the agent execution.
          </p>
          <div className="flex gap-3">
            <button
              className="btn btn-success btn-sm flex-1"
              onClick={() => onApprove(post)}
            >
              ✓ Approve & Publish
            </button>
            <button
              className="btn btn-danger btn-sm flex-1"
              onClick={() => onReject(post)}
            >
              ✕ Reject & Block
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Moderation Component ────────────────────────────────────────────
interface ModerationProps {
  simulated: boolean;
}

export default function Moderation({ simulated }: ModerationProps) {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const addFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const SAMPLE_POSTS = [
    "Just open-sourced my agentic Python framework for building multi-step LLM pipelines. Star it on GitHub!",
    "GUARANTEED 10x returns on crypto! Join our elite trading signals group now — only 50 spots left!",
    "Our startup is looking for early beta testers for our new SaaS tool. Completely free during beta!",
  ];

  const handleSubmitPost = async () => {
    if (!newText.trim()) return;
    setSubmitting(true);

    const tempPost: Post = {
      id: `p-${Date.now()}`,
      author: 'You',
      content: newText,
      chapter: 'Demo',
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    setPosts(prev => [tempPost, ...prev]);
    const postIndex = 0;

    try {
      let action: string, confidence: number, approvalId: string | undefined;

      if (simulated) {
        await new Promise(r => setTimeout(r, 2000));
        const lower = newText.toLowerCase();
        const isSpam = lower.includes('guarantee') || lower.includes('earn') || lower.includes('click') || lower.includes('$') || lower.includes('100%');
        const isBorderline = lower.includes('beta') || lower.includes('startup') || lower.includes('product') || lower.includes('launch');

        if (isSpam) {
          action = 'block'; confidence = 0.95;
        } else if (isBorderline) {
          action = 'paused'; confidence = 0.55; approvalId = `approval-${Date.now()}`;
        } else {
          action = 'allow'; confidence = 0.92;
        }
      } else {
        const res = await reviewContent(newText);
        action = res.action || (res as { status?: string }).status || 'allow';
        confidence = res.confidence;
        approvalId = res.approval_request_id;
      }

      setPosts(prev => prev.map((p, i) => {
        if (p.id === tempPost.id) {
          return {
            ...p,
            status: action === 'allow' ? 'approved' : action === 'block' ? 'rejected' : 'paused',
            confidence,
            approvalRequestId: approvalId,
          };
        }
        return p;
      }));

      if (action === 'allow') addFeedback('success', 'Post approved and published!');
      else if (action === 'block') addFeedback('error', 'Post blocked by moderation.');
      else addFeedback('info', 'Post paused — human approval required.');
    } catch (err) {
      setPosts(prev => prev.map(p =>
        p.id === tempPost.id ? { ...p, status: 'approved', confidence: 0.88 } : p
      ));
      addFeedback('info', simulated ? 'Simulated: Post approved.' : `Backend error: ${err}`);
    } finally {
      setSubmitting(false);
      setNewText('');
    }
  };

  const handleApprove = async (post: Post) => {
    try {
      if (!simulated && post.approvalRequestId) {
        await submitApproval(post.approvalRequestId, 'approved', 'Approved by human moderator');
      }
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, status: 'approved' } : p
      ));
      addFeedback('success', 'Post approved — agent execution resumed!');
    } catch (err) {
      addFeedback('error', `Failed to submit approval: ${err}`);
    }
  };

  const handleReject = async (post: Post) => {
    try {
      if (!simulated && post.approvalRequestId) {
        await submitApproval(post.approvalRequestId, 'rejected', 'Rejected by human moderator');
      }
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, status: 'rejected' } : p
      ));
      addFeedback('error', 'Post rejected — agent execution resumed!');
    } catch (err) {
      addFeedback('error', `Failed to submit rejection: ${err}`);
    }
  };

  const feedbackColors = {
    success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#34d399' },
    error:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  color: '#f87171' },
    info:    { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24' },
  };

  const pausedCount = posts.filter(p => p.status === 'paused').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Content Moderation</h2>
          <p className="section-subtitle">
            The moderation-agent reviews posts with Human-in-the-Loop for borderline content
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pausedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="pulse-dot amber" />
              <span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
                {pausedCount} awaiting approval
              </span>
            </div>
          )}
          {simulated && <span className="badge badge-amber">⚡ Simulated</span>}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className="p-4 rounded-xl text-sm font-medium animate-fade-in"
          style={{
            background: feedbackColors[feedback.type].bg,
            border: `1px solid ${feedbackColors[feedback.type].border}`,
            color: feedbackColors[feedback.type].color,
          }}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Panel */}
        <div className="space-y-4">
          <div className="glass p-5">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Submit a Post for Review
            </h3>
            <textarea
              className="input"
              placeholder="Write your community post…"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              rows={5}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {SAMPLE_POSTS.map((s, i) => (
                <button
                  key={i}
                  className="btn btn-ghost btn-sm text-xs"
                  onClick={() => setNewText(s)}
                >
                  Sample {i + 1}
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary w-full mt-4"
              onClick={handleSubmitPost}
              disabled={submitting || !newText.trim()}
              style={{ opacity: submitting || !newText.trim() ? 0.6 : 1 }}
            >
              {submitting ? (
                <><span className="animate-spin">⟳</span> Analyzing…</>
              ) : (
                <>🛡️ Submit for Moderation</>
              )}
            </button>
          </div>

          {/* HITL Explainer */}
          <div
            className="glass p-4 text-sm"
            style={{ borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <p className="font-semibold mb-2" style={{ color: '#fbbf24' }}>
              ⚡ How Human-in-the-Loop Works
            </p>
            <ol className="space-y-1.5 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
              <li>Agent reviews content and scores confidence</li>
              <li>If {'<'} 70%: execution <strong>pauses</strong> and waits</li>
              <li>Human clicks Approve or Reject in this panel</li>
              <li>Agent resumes with the human decision</li>
            </ol>
          </div>
        </div>

        {/* Post Feed */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              simulated={simulated}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
