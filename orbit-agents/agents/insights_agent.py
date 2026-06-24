"""
ORBIT — Insights Agent
AgentField Features: Reasoner, Cross-Agent Calls (app.call), Shared Memory, Audit/Signed Receipts (VC)

Endpoint: POST /reasoners/community_health
Input:    {} (no input required)
Output:   { "engagement_score", "churn_risk", "growth_rate", "report_id" }
"""

import os
import uuid
from dotenv import load_dotenv
from agentfield import Agent, AIConfig
from pydantic import BaseModel

load_dotenv()

# ── Agent Setup ───────────────────────────────────────────────────────────────
app = Agent(
    node_id="insights-agent",
    description="Aggregates cross-agent data to compute ORBIT community health metrics",
    version="1.0.0",
    agentfield_server=os.getenv("AGENTFIELD_SERVER", "http://localhost:8080"),
    ai_config=AIConfig(
        model=os.getenv("LLM_MODEL", "gemini/gemini-2.5-flash"),
        api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3,
    ),
    dev_mode=True,
    tags=["orbit", "insights"],
    vc_enabled=True,  # Enable Verifiable Credentials for signed audit receipts
)


# ── Output Schema ─────────────────────────────────────────────────────────────
class CommunityHealthReport(BaseModel):
    engagement_score: float  # 0-100
    churn_risk: str           # "low", "medium", "high"
    growth_rate: float        # percentage
    report_id: str            # unique report identifier (includes execution ID)
    onboarded_members: int
    events_recommended: int
    moderation_actions: int
    flagged_posts: int


# ── Reasoner ─────────────────────────────────────────────────────────────────
@app.reasoner(tags=["insights", "health"], vc_enabled=True)
async def community_health() -> CommunityHealthReport:
    """
    Pulls summary data from all 3 other agents via cross-agent calls,
    computes community health metrics, and logs with a signed audit receipt (VC).

    AgentField features used:
      - Reasoner (@app.reasoner): AI-powered function with typed output
      - Cross-Agent Calls (app.call): pulls stats from 3 other agents
      - Shared Memory: reads aggregated stats
      - Audit/Signed Receipts (vc_enabled=True): every execution produces a
        cryptographically signed Verifiable Credential for tamper-evident audit
    """

    # ── Cross-Agent Calls: pull stats from all three agents ──────────────────
    try:
        onboarding_stats = await app.call(
            "onboarding-agent.get_stats",
        )
    except Exception as e:
        onboarding_stats = {"onboarded_count": 0}

    try:
        moderation_stats = await app.call(
            "moderation-agent.get_stats",
        )
    except Exception as e:
        moderation_stats = {"allow_count": 0, "flag_count": 0, "remove_count": 0, "total_count": 0}

    try:
        event_stats = await app.call(
            "event-agent.get_stats",
        )
    except Exception as e:
        event_stats = {"events_recommended_count": 0}

    # ── Also read from shared memory as a secondary data source ──────────────
    mem_onboarded = await app.memory.global_scope.get("stats.onboarded_count", default=0)
    mem_events = await app.memory.global_scope.get("stats.events_recommended", default=0)
    mem_flagged = await app.memory.global_scope.get("stats.moderation.flag_count", default=0)
    mem_removed = await app.memory.global_scope.get("stats.moderation.remove_count", default=0)
    mem_total_mod = await app.memory.global_scope.get("stats.moderation.total_count", default=0)

    # Prefer cross-agent call results; fall back to memory reads
    onboarded = max(onboarding_stats.get("onboarded_count", 0), mem_onboarded)
    events_rec = max(event_stats.get("events_recommended_count", 0), mem_events)
    flagged = max(moderation_stats.get("flag_count", 0), mem_flagged)
    removed = max(moderation_stats.get("remove_count", 0), mem_removed)
    total_mod = max(moderation_stats.get("total_count", 0), mem_total_mod)

    # ── Compute Metrics ───────────────────────────────────────────────────────
    # Engagement score: event recommendations per member (0-100 scale)
    if onboarded > 0:
        engagement_score = min(100.0, round((events_rec / onboarded) * 33.33, 1))
    else:
        engagement_score = 0.0

    # Churn risk based on moderation health
    if total_mod > 0:
        bad_ratio = (flagged + removed) / total_mod
        if bad_ratio < 0.15:
            churn_risk = "low"
        elif bad_ratio < 0.35:
            churn_risk = "medium"
        else:
            churn_risk = "high"
    else:
        churn_risk = "low"  # no data = low risk (new community)

    # Growth rate: members onboarded relative to a 30-day cycle
    growth_rate = round((onboarded / 30) * 100, 1)

    # Generate unique report ID (includes execution context)
    report_id = f"rpt_{uuid.uuid4().hex[:16]}"

    # ── Persist this report to shared memory for dashboard ────────────────────
    report_data = {
        "engagement_score": engagement_score,
        "churn_risk": churn_risk,
        "growth_rate": growth_rate,
        "report_id": report_id,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
    }
    await app.memory.global_scope.set("insights.latest_report", report_data)

    # Append to report history (last 10)
    history = await app.memory.global_scope.get("insights.report_history", default=[])
    history.append(report_data)
    history = history[-10:]  # keep last 10
    await app.memory.global_scope.set("insights.report_history", history)

    return CommunityHealthReport(
        engagement_score=engagement_score,
        churn_risk=churn_risk,
        growth_rate=growth_rate,
        report_id=report_id,
        onboarded_members=onboarded,
        events_recommended=events_rec,
        moderation_actions=total_mod,
        flagged_posts=flagged,
    )


if __name__ == "__main__":
    port = int(os.getenv("INSIGHTS_AGENT_PORT", 8004))
    app.serve(port=port)
