/**
 * Mock data for simulated mode — used when the backend is offline.
 */
import type { CommunityStats, VerifiableCredential, Member, Event, Post } from './types';

export const MOCK_STATS: CommunityStats = {
  total_members: 247,
  active_chapters: 5,
  total_events: 34,
  flagged_posts: 3,
  health_score: 87,
  growth_rate: 12.4,
  churn_risk: 8.2,
  engagement_rate: 73.6,
};

export const MOCK_VC: VerifiableCredential = {
  issuer: 'orbit://insights-agent',
  issued_at: new Date().toISOString(),
  subject: 'orbit://community/india',
  claims: {
    total_members: 247,
    health_score: 87,
    active_chapters: 5,
    verified_by: 'insights-agent-v1',
  },
  signature: 'sha256:a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789ab',
  algorithm: 'HMAC-SHA256',
};

export const MOCK_CHAPTER_BREAKDOWN: Record<string, number> = {
  Delhi: 58,
  Bangalore: 71,
  Mumbai: 49,
  Hyderabad: 43,
  Pune: 26,
};

export const MOCK_MEMBERS: Member[] = [
  { id: 'm001', name: 'Arjun Sharma',   chapter: 'Bangalore', interests: ['ML', 'Python', 'LLMs'],      joinedAt: '2025-11-15' },
  { id: 'm002', name: 'Priya Nair',     chapter: 'Mumbai',    interests: ['Web3', 'DeFi', 'React'],     joinedAt: '2025-12-01' },
  { id: 'm003', name: 'Rahul Gupta',    chapter: 'Delhi',     interests: ['DevOps', 'Kubernetes', 'Go'], joinedAt: '2026-01-10' },
  { id: 'm004', name: 'Sneha Patel',    chapter: 'Pune',      interests: ['UI/UX', 'Figma', 'React'],   joinedAt: '2026-02-03' },
  { id: 'm005', name: 'Vikram Singh',   chapter: 'Hyderabad', interests: ['Data Engineering', 'Spark'], joinedAt: '2026-03-20' },
  { id: 'm006', name: 'Ananya Roy',     chapter: 'Bangalore', interests: ['Agents', 'LLMs', 'FastAPI'], joinedAt: '2026-04-08' },
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e001',
    title: 'LLM Agents & Agentic Workflows — A Practical Workshop',
    chapter: 'Bangalore',
    date: '2026-07-05',
    category: 'Workshop',
    speaker: 'Dr. Aisha Mehta',
    venue: 'Indiranagar CoWork Hub',
    matchScore: 0.95,
    matchReason: 'Strong alignment with your interest in AI Agents and LLMs.',
  },
  {
    id: 'e002',
    title: 'Scaling Python Microservices with FastAPI & Redis',
    chapter: 'Bangalore',
    date: '2026-07-12',
    category: 'Meetup',
    speaker: 'Karan Mehta',
    venue: 'HSR Layout Tech Hub',
    matchScore: 0.88,
    matchReason: 'Matches your Python and backend development interests.',
  },
  {
    id: 'e003',
    title: 'Web3 DeFi Deep Dive: Smart Contracts on Ethereum',
    chapter: 'Mumbai',
    date: '2026-07-08',
    category: 'Conference',
    speaker: 'Nisha Kulkarni',
    venue: 'Bandra Kurla Complex',
    matchScore: 0.91,
    matchReason: 'Perfect match for your Web3 and DeFi interests.',
  },
  {
    id: 'e004',
    title: 'Kubernetes for Production: Best Practices 2026',
    chapter: 'Delhi',
    date: '2026-07-15',
    category: 'Workshop',
    speaker: 'Rajesh Khanna',
    venue: 'Connaught Place Tech Centre',
    matchScore: 0.93,
    matchReason: 'Directly aligned with your Kubernetes and DevOps interests.',
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p001',
    author: 'Arjun Sharma',
    content: 'Just published a detailed write-up on multi-agent orchestration patterns with AgentField! Check it out on my blog. Really excited to present this at the next Bangalore meetup.',
    chapter: 'Bangalore',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: 'approved',
    confidence: 0.97,
  },
  {
    id: 'p002',
    author: 'Unknown User',
    content: 'Earn $5000/week from home! Our AI trading bot guarantees 200% returns. Join now and get access to exclusive crypto signals. LIMITED TIME OFFER!',
    chapter: 'Mumbai',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    status: 'rejected',
    confidence: 0.99,
  },
  {
    id: 'p003',
    author: 'Priya Nair',
    content: 'Our startup is looking for beta testers for our new DeFi wallet app. It\'s free to use, and testers get priority access. Would love feedback from this community!',
    chapter: 'Mumbai',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    status: 'paused',
    confidence: 0.58,
    approvalRequestId: 'approval-demo-001',
    executionId: 'exec-demo-001',
  },
];

export const CHAPTERS = ['Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Mumbai'] as const;

export const PROFILE_TEMPLATES = [
  {
    label: 'Bangalore ML Engineer',
    text: 'I am a machine learning engineer with 4 years of experience building NLP pipelines and LLM-powered applications. I am passionate about AI agents, Python, and MLOps. Looking to connect with the ML community.',
  },
  {
    label: 'Mumbai Startup Founder',
    text: 'Serial entrepreneur building a Web3 DeFi platform. Background in blockchain, smart contracts, and tokenomics. Seeking co-founders and investors in the fintech and crypto space.',
  },
  {
    label: 'Delhi DevOps Lead',
    text: 'Senior DevOps engineer specializing in Kubernetes, Terraform, and cloud infrastructure at scale. I love automating things and sharing knowledge about platform engineering best practices.',
  },
  {
    label: 'Pune UI/UX Designer',
    text: 'Product designer with a passion for creating beautiful, accessible interfaces. I work with Figma, React, and design systems. Interested in the intersection of design and AI.',
  },
  {
    label: 'Hyderabad Data Engineer',
    text: 'Data engineer with deep expertise in Apache Spark, Kafka, and building real-time data pipelines. Interested in the data engineering community and sharing insights on big data architectures.',
  },
];
