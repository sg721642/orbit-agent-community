# AgentField Integration Reference

> How ORBIT uses the [AgentField](https://agentfield.ai) SDK to build a production-grade multi-agent system.

---

## Overview

ORBIT leverages the **AgentField Python SDK** to define, serve, and orchestrate four independent AI agents. Each agent:

- Is defined using the `Agent` class from the `agentfield` package
- Exposes **reasoners** (LLM-powered functions) as HTTP endpoints
- Connects to a **control plane** at startup for registration, routing, and cross-agent calls
- Can use `app.pause()` to trigger Human-in-the-Loop approval gateways

In production, agents connect to the AgentField cloud control plane. In our local dev setup, we run `mock_control_plane.py` (a FastAPI server on port 8080) which fully simulates the AgentField server API.

---

## SDK Setup

### Installation

```bash
pip install agentfield[server] litellm google-generativeai
```

### Environment Variables (`.env`)

```dotenv
# LLM Provider
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini/gemini-2.5-flash

# AgentField Control Plane (local mock)
AGENTFIELD_API_URL=http://localhost:8080
AGENTFIELD_API_KEY=local-dev-key

# Agent Ports
ONBOARDING_AGENT_PORT=8001
MODERATION_AGENT_PORT=8002
EVENT_AGENT_PORT=8003
INSIGHTS_AGENT_PORT=8004
```

---

## Agent Definition Pattern

Every ORBIT agent follows this pattern:

```python
from agentfield import Agent
import litellm
import os

# 1. Instantiate the Agent
app = Agent(
    node_id="onboarding-agent",           # Unique agent ID
    name="ORBIT Onboarding Agent",
    version="1.0.0",
    control_plane_url=os.getenv("AGENTFIELD_API_URL", "http://localhost:8080"),
    api_key=os.getenv("AGENTFIELD_API_KEY", "local-dev-key"),
)

# 2. Define a Reasoner (LLM-powered function)
@app.reasoner("match_member")
async def match_member(profile: str) -> dict:
    response = litellm.completion(
        model=os.getenv("GEMINI_MODEL", "gemini/gemini-2.5-flash"),
        api_key=os.getenv("GOOGLE_API_KEY"),
        messages=[
            {"role": "system", "content": "You are an expert community manager..."},
            {"role": "user",   "content": f"Profile: {profile}"}
        ]
    )
    # Parse and return structured result
    return {"chapter": "Bangalore", "welcome_message": "..."}

# 3. Serve the agent on its port
if __name__ == "__main__":
    app.serve(port=8001)
```

---

## The Four Agents

### 1. `onboarding-agent` (Port 8001)

**Purpose:** Match new members to a city chapter based on their bio/interests.

**Reasoner:** `match_member`

| Field | Type | Description |
|-------|------|-------------|
| `profile` | `str` | Free-text member bio or interests |
| → `chapter` | `str` | One of: `Delhi`, `Bangalore`, `Pune`, `Hyderabad`, `Mumbai` |
| → `welcome_message` | `str` | Personalised welcome message |

**cURL Example:**
```bash
# 1. Submit the task
curl -X POST http://localhost:8080/api/v1/execute/async/onboarding-agent.match_member \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "profile": "I am a machine learning engineer with 4 years experience in NLP, LLMs, and Python. I love building AI agents and want to contribute to the community."
    }
  }'

# Response: {"execution_id": "exec_abc123", "status": "pending"}

# 2. Poll for the result
curl http://localhost:8080/api/v1/executions/exec_abc123

# Response when done:
# {
#   "status": "succeeded",
#   "result": {
#     "chapter": "Bangalore",
#     "welcome_message": "Welcome to ORBIT Bangalore! Your LLM expertise is exactly what our community needs..."
#   }
# }
```

---

### 2. `moderation-agent` (Port 8002)

**Purpose:** Review community posts for spam, toxicity, or policy violations. Uses **Human-in-the-Loop** for borderline cases.

**Reasoner:** `review_content`

| Field | Type | Description |
|-------|------|-------------|
| `text` | `str` | The community post text to review |
| → `action` | `str` | `"allow"`, `"block"`, or `"paused"` (HITL triggered) |
| → `reason` | `str` | Explanation for the decision |
| → `confidence` | `float` | 0.0 – 1.0 confidence score |
| → `approval_request_id` | `str?` | Present only when execution is paused |

**HITL Flow:**
```python
@app.reasoner("review_content")
async def review_content(text: str) -> dict:
    score = await llm_score(text)
    
    if score["confidence"] < 0.70:
        # Pause execution and wait for human decision
        decision = await app.pause(
            message=f"Borderline content detected (confidence: {score['confidence']:.0%}). Please review.",
            context={"text": text, "reason": score["reason"]}
        )
        return {
            "action": "allow" if decision["approved"] else "block",
            "reason": f"Human decision: {decision.get('feedback', '')}",
            "confidence": 1.0  # Human overrides AI
        }
    
    return score
```

**cURL Example — Clean post:**
```bash
curl -X POST http://localhost:8080/api/v1/execute/async/moderation-agent.review_content \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Excited to share my write-up on building ML pipelines with AgentField!"}}'
# Returns: {"action": "allow", "confidence": 0.96, "reason": "Educational tech content"}
```

**cURL Example — HITL triggered:**
```bash
# 1. Submit borderline post
curl -X POST http://localhost:8080/api/v1/execute/async/moderation-agent.review_content \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Our startup is looking for beta testers. Completely free!"}}'

# 2. Check status — will show "paused"
curl http://localhost:8080/api/v1/executions/exec_xyz

# 3. List pending approvals
curl http://localhost:8080/api/v1/admin/approvals

# 4. Submit human decision
curl -X POST http://localhost:8080/api/v1/webhooks/approval-response \
  -H "Content-Type: application/json" \
  -d '{
    "approval_request_id": "req_abc123",
    "decision": "approved",
    "feedback": "Legitimate community ask"
  }'
```

---

### 3. `event-agent` (Port 8003)

**Purpose:** Recommend personalised tech meetups based on a member's chapter and interests.

**Reasoner:** `recommend_events`

| Field | Type | Description |
|-------|------|-------------|
| `member_id` | `str` | Member identifier |
| `chapter` | `str` | Member's city chapter |
| `interests` | `list[str]` | List of interest tags |
| → `events` | `list[Event]` | Matched events with `match_score` and `match_reason` |

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/execute/async/event-agent.recommend_events \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "member_id": "m001",
      "chapter": "Bangalore",
      "interests": ["ML", "Python", "LLMs", "AI Agents"]
    }
  }'
```

---

### 4. `insights-agent` (Port 8004)

**Purpose:** Perform cross-agent analytics, compute community health, and generate signed Verifiable Credentials.

**Reasoner:** `community_health`

This agent makes **cross-agent calls** to the other three agents via the control plane to aggregate statistics, then signs the result as a W3C-inspired Verifiable Credential using HMAC-SHA256.

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/execute/async/insights-agent.community_health \
  -H "Content-Type: application/json" \
  -d '{"input": {}}'

# Returns:
# {
#   "stats": {"total_members": 247, "health_score": 87, ...},
#   "verifiable_credential": {
#     "issuer": "orbit://insights-agent",
#     "claims": {...},
#     "signature": "sha256:a1b2c3...",
#     "algorithm": "HMAC-SHA256"
#   },
#   "chapter_breakdown": {"Bangalore": 71, "Delhi": 58, ...}
# }
```

---

## Control Plane API Reference

The mock control plane (`mock_control_plane.py`) implements all AgentField control plane endpoints needed for local development.

### Node Registration & Heartbeat

```
POST /api/v1/nodes/register          — Agent registers on startup
POST /api/v1/nodes/{node_id}/heartbeat — Keepalive ping
POST /api/v1/nodes/{node_id}/shutdown  — Agent deregisters on stop
```

### Async Execution

```
POST /api/v1/execute/async/{target}  — Start async execution
     Body: {"input": {...}}
     Response: {"execution_id": "...", "status": "pending"}

GET  /api/v1/executions/{id}         — Poll execution status
     Response: {"status": "pending|running|succeeded|failed|paused", "result": ...}
```

### Shared Memory (KV Store)

```
POST /api/v1/memory/set    — Store a key-value pair
POST /api/v1/memory/get    — Retrieve by key
POST /api/v1/memory/delete — Delete by key
POST /api/v1/memory/list   — List all keys
```

### Human-in-the-Loop

```
POST /api/v1/agents/{node_id}/executions/{exec_id}/request-approval
     — Called by agent when pausing for human review

GET  /api/v1/admin/approvals
     — List all pending approval requests

POST /api/v1/webhooks/approval-response
     Body: {"approval_request_id": "...", "decision": "approved|rejected", "feedback": "..."}
     — Submit human decision; control plane forwards to agent webhook to resume execution
```

---

## Execution Flow Sequence

```
Dashboard                Control Plane              Agent
    │                         │                       │
    │── POST /execute/async ──▶│                       │
    │◀── {execution_id} ──────│                       │
    │                         │── forward_execution ──▶│
    │                         │                       │── call Gemini
    │── GET /executions/{id} ─▶│                       │
    │◀── {status: "running"} ─│                       │
    │                         │                       │
    │   [if borderline:]      │                       │
    │                         │◀── request-approval ──│
    │                         │                       │── await pause()
    │◀── {status: "paused"} ──│                       │
    │                         │                       │
    │── POST /approval-response▶│                      │
    │                         │── POST /webhooks/approval ──▶│
    │                         │                       │── resume execution
    │── GET /executions/{id} ─▶│                       │
    │◀── {status: "succeeded"}│                       │
```

---

## Shared Memory Usage

Agents use the control plane's KV memory store for cross-agent data sharing:

```python
# Write to shared memory (e.g., from seed_data.py)
await client.memory_set("members:all", members_list, scope="global")

# Read from shared memory (e.g., in event-agent)
data = await client.memory_get("members:all")
```

---

## Running Tests

```bash
cd orbit-agents
$env:PYTHONIOENCODING="utf-8"
python test_agents.py
```

The test suite verifies all 5 scenarios:
1. ✅ Onboarding — chapter matching
2. ✅ Moderation — clean post allowed automatically  
3. ✅ Moderation — HITL triggered for borderline post
4. ✅ Events — personalised recommendations returned
5. ✅ Insights — community health + signed VC generated

---

*Part of [ORBIT](../README.md) — Agent{A}thon 2026 submission.*
