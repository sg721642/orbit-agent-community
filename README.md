# ORBIT — Community Operations Platform

> **Agent{A}thon 2026 submission** · Multi-agent community platform built with [AgentField](https://agentfield.ai) + Google Gemini

[![GitHub](https://img.shields.io/badge/repo-orbit--agent--community-6366f1?logo=github)](https://github.com/sg721642/orbit-agent-community)
[![AgentField](https://img.shields.io/badge/powered%20by-AgentField-8b5cf6)](https://agentfield.ai)
[![Gemini](https://img.shields.io/badge/LLM-Google%20Gemini-10b981?logo=google)](https://aistudio.google.com)

---

## What is ORBIT?

ORBIT is an end-to-end AI-powered community operations platform for managing tech communities across 5 Indian cities: **Delhi, Bangalore, Pune, Hyderabad, and Mumbai**.

It uses a **multi-agent system** (built with the AgentField SDK) to automate three key workflows:
1. **Onboarding** — Match new members to their best-fit city chapter using NLP
2. **Content Moderation** — Automatically review posts with a Human-in-the-Loop (HITL) approval gateway for borderline content
3. **Event Recommendations** — Personalise meetup suggestions based on each member's interests
4. **Community Insights** — Generate cross-agent analytics reports with cryptographically signed Verifiable Credentials

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       orbit-dashboard (React + Vite)                 │
│          ┌──────────┬──────────────┬──────────┬──────────────┐      │
│          │ Overview │  Onboarding  │Moderation│    Events    │      │
│          └──────────┴──────────────┴──────────┴──────────────┘      │
│                          ↕ /api/v1/* (Vite proxy)                    │
└─────────────────────────────────────────────────────────────────────┘
                               │
                 ┌─────────────▼────────────┐
                 │  Mock Control Plane       │
                 │  (mock_control_plane.py)  │
                 │  Port 8080 · FastAPI      │
                 │  • Agent Registry         │
                 │  • Async Execution Routing│
                 │  • Shared Memory (KV)     │
                 │  • HITL Approval Gateway  │
                 └──────────┬───────────────┘
          ┌─────────────────┼─────────────────┐
          │                 │                 │
  ┌───────▼──────┐  ┌───────▼──────┐  ┌──────▼───────┐  ┌─────────────────┐
  │ onboarding   │  │ moderation   │  │ event        │  │ insights        │
  │ -agent       │  │ -agent       │  │ -agent       │  │ -agent          │
  │ Port 8001    │  │ Port 8002    │  │ Port 8003    │  │ Port 8004       │
  │              │  │  + HITL      │  │              │  │ + Cross-agent   │
  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘
          │                 │                 │                  │
          └─────────────────┴─────────────────┴──────────────────┘
                                      │
                           ┌──────────▼──────────┐
                           │   Google Gemini API  │
                           │  (gemini-2.5-flash)  │
                           └─────────────────────┘
```

---

## Project Structure

```
orbit-agent-community/
├── orbit-agents/                  ← Python backend
│   ├── .env                       ← API keys (git-ignored)
│   ├── .env.example               ← Template for env vars
│   ├── requirements.txt           ← Python dependencies
│   ├── mock_control_plane.py      ← Local AgentField control plane (port 8080)
│   ├── seed_data.py               ← Seeds member & event data
│   ├── test_agents.py             ← Verification tests for all 5 scenarios
│   ├── start_all.ps1              ← PowerShell script to start all services
│   └── agents/
│       ├── onboarding_agent.py    ← Chapter matching agent (port 8001)
│       ├── moderation_agent.py    ← Content review + HITL agent (port 8002)
│       ├── event_agent.py         ← Event recommendation agent (port 8003)
│       └── insights_agent.py      ← Analytics + Verifiable Credentials (port 8004)
└── orbit-dashboard/               ← React + Vite frontend
    ├── src/
    │   ├── App.tsx                ← Main shell with tab navigation
    │   ├── api.ts                 ← API client (polling-based async execution)
    │   ├── types.ts               ← Shared TypeScript interfaces
    │   ├── mockData.ts            ← Simulated mode data
    │   ├── index.css              ← Dark glassmorphism design system
    │   └── components/
    │       ├── Overview.tsx       ← Community health + Verifiable Credential
    │       ├── Onboarding.tsx     ← Chapter matching form + confetti
    │       ├── Moderation.tsx     ← Post feed + HITL Approve/Reject
    │       └── Events.tsx         ← Personalised event recommendations
    ├── vite.config.ts             ← Vite + /api/v1 reverse proxy
    ├── tailwind.config.js
    └── package.json
```

---

## Quick Start

### Prerequisites
- Python 3.10+  
- Node.js 18+  
- A free [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Clone & Configure

```bash
git clone https://github.com/sg721642/orbit-agent-community.git
cd orbit-agent-community/orbit-agents

# Copy the env template and add your key
cp .env.example .env
# Edit .env and set:  GOOGLE_API_KEY=your_key_here
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the backend

```powershell
# Terminal 1 — Control Plane
python mock_control_plane.py

# Terminal 2 — All 4 agents
$env:PYTHONIOENCODING="utf-8"
python agents/onboarding_agent.py  # port 8001
python agents/moderation_agent.py  # port 8002
python agents/event_agent.py       # port 8003
python agents/insights_agent.py    # port 8004

# Or use the startup script:
powershell -ExecutionPolicy Bypass -File start_all.ps1
```

### 4. Seed the database

```bash
$env:PYTHONIOENCODING="utf-8"; python seed_data.py
```

### 5. Start the frontend

```bash
cd ../orbit-dashboard
npm install
npm run dev
# Open http://localhost:5173
```

---

## AgentField Integration

See [agentfield_integration.md](./agentfield_integration.md) for the full API reference.

### Key Endpoints (Mock Control Plane at `http://localhost:8080`)

#### Execute onboarding-agent
```bash
curl -X POST http://localhost:8080/api/v1/execute/async/onboarding-agent.match_member \
  -H "Content-Type: application/json" \
  -d '{"input": {"profile": "I am a senior ML engineer passionate about LLMs and AI agents."}}'
```

#### Execute moderation-agent
```bash
curl -X POST http://localhost:8080/api/v1/execute/async/moderation-agent.review_content \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Check out our next Bangalore ML meetup — all are welcome!"}}'
```

#### Poll execution result
```bash
# Use the execution_id returned by the above command
curl http://localhost:8080/api/v1/executions/{execution_id}
```

#### Approve a paused HITL execution
```bash
curl -X POST http://localhost:8080/api/v1/webhooks/approval-response \
  -H "Content-Type: application/json" \
  -d '{"approval_request_id": "req-xxxx", "decision": "approved", "feedback": "Looks good"}'
```

#### List pending approvals
```bash
curl http://localhost:8080/api/v1/admin/approvals
```

---

## The Four Agents

| Agent | Port | Capability |
|-------|------|------------|
| `onboarding-agent` | 8001 | `match_member(profile)` → `{chapter, welcome_message}` |
| `moderation-agent` | 8002 | `review_content(text)` → `{action, reason, confidence}` + HITL pause |
| `event-agent`      | 8003 | `recommend_events(member_id, chapter, interests)` → `{events[]}` |
| `insights-agent`   | 8004 | `community_health()` → `{stats, verifiable_credential, chapter_breakdown}` |

---

## Human-in-the-Loop (HITL)

The `moderation-agent` uses AgentField's `app.pause()` to implement a real HITL gateway:

1. Agent scores content confidence with Gemini
2. If confidence < 70%, execution **pauses** and notifies the control plane
3. The ORBIT dashboard shows an orange pulsing "Human Approval Required" card
4. Human clicks **Approve** or **Reject** — decision POSTs to `/api/v1/webhooks/approval-response`
5. Control plane forwards the decision to the agent's webhook → execution resumes

---

## Verifiable Credentials

The `insights-agent` generates cryptographically signed audit receipts (W3C VC-inspired):

```json
{
  "issuer": "orbit://insights-agent",
  "issued_at": "2026-06-24T07:00:00Z",
  "subject": "orbit://community/india",
  "claims": {
    "total_members": 247,
    "health_score": 87,
    "active_chapters": 5
  },
  "signature": "sha256:a1b2c3d4...",
  "algorithm": "HMAC-SHA256"
}
```

---

## Dashboard Features

| Tab | Feature |
|-----|---------|
| **Overview** | Live community stats, chapter breakdown bars, health score ring, signed VC viewer |
| **Onboarding** | Bio input with templates, real-time chapter matching, confetti celebration |
| **Moderation** | Post submission, AI confidence meter, live HITL approve/reject buttons |
| **Events** | Member selector, personalised event cards with match score bars |

The dashboard auto-detects backend availability and falls back to **Simulated Mode** gracefully.

---

## Tech Stack

**Backend**
- [AgentField](https://agentfield.ai) Python SDK — multi-agent orchestration
- [LiteLLM](https://litellm.ai) — unified LLM provider interface
- Google Gemini (`gemini/gemini-2.5-flash`) — LLM reasoning
- FastAPI + Uvicorn — agent HTTP servers
- httpx — async HTTP client for cross-agent calls

**Frontend**
- React 18 + TypeScript
- Vite 5 — dev server with `/api/v1` reverse proxy
- Tailwind CSS v3 — utility-first styling
- Vanilla CSS — custom glassmorphism design system

---

## License

MIT — built for Agent{A}thon 2026.
