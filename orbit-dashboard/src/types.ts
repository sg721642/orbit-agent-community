// Shared types for the ORBIT dashboard

export interface Member {
  id: string;
  name: string;
  chapter: string;
  interests: string[];
  joinedAt: string;
}

export interface Post {
  id: string;
  author: string;
  content: string;
  chapter: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'paused';
  confidence?: number;
  approvalRequestId?: string;
  executionId?: string;
}

export interface Event {
  id: string;
  title: string;
  chapter: string;
  date: string;
  category: string;
  matchScore?: number;
  matchReason?: string;
  speaker?: string;
  venue?: string;
  registrationUrl?: string;
}

export interface OnboardingResult {
  chapter: string;
  welcome_message: string;
  member_id?: string;
}

export interface ModerationResult {
  action: 'allow' | 'block' | 'paused';
  reason: string;
  confidence: number;
  approval_request_id?: string;
  execution_id?: string;
}

export interface CommunityStats {
  total_members: number;
  active_chapters: number;
  total_events: number;
  flagged_posts: number;
  health_score: number;
  growth_rate: number;
  churn_risk: number;
  engagement_rate: number;
}

export interface VerifiableCredential {
  issuer: string;
  issued_at: string;
  subject: string;
  claims: Record<string, unknown>;
  signature: string;
  algorithm: string;
}

export interface InsightsResult {
  stats: CommunityStats;
  verifiable_credential: VerifiableCredential;
  chapter_breakdown: Record<string, number>;
}

export type TabId = 'overview' | 'onboarding' | 'moderation' | 'events';

export interface ApiError {
  message: string;
  code?: string;
}
