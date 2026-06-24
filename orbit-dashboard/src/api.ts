/**
 * ORBIT API Client
 * Calls our Mock Control Plane at http://localhost:8080
 * Falls back to simulated data when backend is unreachable.
 */

const BASE_URL = '/api/v1';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Execute an agent reasoner (async, poll-based) ─────────────────────────
async function executeAgent<T>(
  target: string,
  input: Record<string, unknown>,
  timeoutMs = 60_000
): Promise<T> {
  const { execution_id } = await apiFetch<{ execution_id: string }>(
    `${BASE_URL}/execute/async/${target}`,
    { method: 'POST', body: JSON.stringify({ input }) }
  );

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1200));
    const status = await apiFetch<{ status: string; result?: T; error?: string }>(
      `${BASE_URL}/executions/${execution_id}`
    );
    if (status.status === 'succeeded') return status.result as T;
    if (status.status === 'failed') throw new Error(status.error || 'Execution failed');
    if (status.status === 'paused') {
      // Return paused state with the execution_id embedded
      return { ...(status as unknown as T), execution_id } as T;
    }
  }
  throw new Error('Execution timed out');
}

// ─── Onboarding Agent ──────────────────────────────────────────────────────
export async function matchMember(profile: string) {
  return executeAgent<{ chapter: string; welcome_message: string }>(
    'onboarding-agent.match_member',
    { profile }
  );
}

// ─── Moderation Agent ──────────────────────────────────────────────────────
export async function reviewContent(text: string) {
  return executeAgent<{
    action: string;
    reason: string;
    confidence: number;
    approval_request_id?: string;
    execution_id?: string;
    status?: string;
  }>('moderation-agent.review_content', { text });
}

export async function submitApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
  feedback?: string
) {
  return apiFetch(`${BASE_URL}/webhooks/approval-response`, {
    method: 'POST',
    body: JSON.stringify({
      approval_request_id: approvalId,
      decision,
      feedback: feedback || '',
    }),
  });
}

export async function listPendingApprovals() {
  return apiFetch<Array<{ approval_request_id: string; execution_id: string; node_id: string }>>(
    `${BASE_URL}/admin/approvals`
  );
}

// ─── Event Agent ───────────────────────────────────────────────────────────
export async function recommendEvents(memberId: string, chapter: string, interests: string[]) {
  return executeAgent<{ events: Array<{
    id: string; title: string; chapter: string; date: string;
    category: string; match_score: number; match_reason: string;
    speaker?: string; venue?: string;
  }> }>('event-agent.recommend_events', { member_id: memberId, chapter, interests });
}

// ─── Insights Agent ────────────────────────────────────────────────────────
export async function getCommunityHealth() {
  return executeAgent<{
    stats: Record<string, number>;
    verifiable_credential: {
      issuer: string; issued_at: string; subject: string;
      claims: Record<string, unknown>; signature: string; algorithm: string;
    };
    chapter_breakdown: Record<string, number>;
  }>('insights-agent.community_health', {});
}

export async function getMemoryKey(key: string) {
  return apiFetch<{ data: unknown }>(`${BASE_URL}/memory/get`, {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}
