"""
ORBIT — Moderation Agent
AgentField Features: Reasoner, Human-in-the-Loop (app.pause), Shared Memory

Endpoint: POST /reasoners/review_content
Input:    { "text": "<post content>" }
Output:   { "action": "allow|flag|remove", "confidence": 0.0-1.0, "reason": "<string>" }

HITL Logic:
  If confidence < 0.7, the execution PAUSES and waits for human approval
  before the action is applied. The approval endpoint is:
    POST http://localhost:8080/api/v1/webhooks/approval-response
"""

import os
import uuid
from dotenv import load_dotenv
from agentfield import Agent, AIConfig
from pydantic import BaseModel

load_dotenv()

# ── Agent Setup ───────────────────────────────────────────────────────────────
app = Agent(
    node_id="moderation-agent",
    description="Classifies community posts and enforces HITL review for uncertain cases",
    version="1.0.0",
    agentfield_server=os.getenv("AGENTFIELD_SERVER", "http://localhost:8080"),
    ai_config=AIConfig(
        model=os.getenv("LLM_MODEL", "gemini/gemini-2.5-flash"),
        api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.2,  # low temp for consistent moderation decisions
    ),
    dev_mode=True,
    tags=["orbit", "moderation"],
)

HITL_CONFIDENCE_THRESHOLD = 0.7

# ── Output Schema ─────────────────────────────────────────────────────────────
class ModerationDecision(BaseModel):
    action: str       # "allow", "flag", or "remove"
    confidence: float # 0.0 - 1.0
    reason: str       # short explanation of the decision


class ModerationResult(BaseModel):
    action: str
    confidence: float
    reason: str
    hitl_triggered: bool = False
    hitl_decision: str = "not_required"


# ── Reasoner ─────────────────────────────────────────────────────────────────
@app.reasoner(tags=["moderation"])
async def review_content(text: str) -> ModerationResult:
    """
    Classifies community posts as allow/flag/remove with confidence score.

    AgentField features used:
      - Reasoner (@app.reasoner): AI-powered function with typed output
      - Human-in-the-Loop (app.pause): pauses execution when confidence < 0.7
      - Shared Memory: tracks moderation action counts for insights-agent
    """

    # ── AI classification ─────────────────────────────────────────────────────
    decision = await app.ai(
        system=(
            "You are ORBIT's community content moderator. "
            "Analyse the post text and classify it as one of:\n"
            "  - 'allow': wholesome community content, on-topic tech discussions\n"
            "  - 'flag': borderline content needing human review (mild spam, "
            "    off-topic, potentially promotional but not clearly malicious)\n"
            "  - 'remove': clear spam, harassment, hate speech, or malicious links\n\n"
            "Also provide a confidence score (0.0-1.0) reflecting how certain you are, "
            "and a brief reason. Return valid JSON only."
        ),
        user=f"Community post:\n{text}",
        schema=ModerationDecision,
    )

    hitl_triggered = False
    hitl_decision = "not_required"

    # ── Human-in-the-Loop gate ────────────────────────────────────────────────
    if decision.confidence < HITL_CONFIDENCE_THRESHOLD:
        hitl_triggered = True
        approval_request_id = f"moderation-{uuid.uuid4().hex[:12]}"

        # Pause execution — AgentField persists state and waits for webhook
        approval_result = await app.pause(
            approval_request_id=approval_request_id,
            approval_request_url=(
                f"http://localhost:8080/api/v1/admin/approvals/{approval_request_id}"
            ),
            expires_in_hours=1,
        )

        # After human responds, use their decision
        if approval_result.decision == "approved":
            hitl_decision = "approved_by_human"
        elif approval_result.decision == "rejected":
            # Human rejected the AI action — override to flag
            decision.action = "flag"
            hitl_decision = "rejected_by_human_downgraded_to_flag"
        else:
            hitl_decision = f"human_decision_{approval_result.decision}"

    # ── Shared Memory write (for insights-agent) ──────────────────────────────
    action_key = f"stats.moderation.{decision.action}_count"
    current = await app.memory.global_scope.get(action_key, default=0)
    await app.memory.global_scope.set(action_key, current + 1)

    total_key = "stats.moderation.total_count"
    total = await app.memory.global_scope.get(total_key, default=0)
    await app.memory.global_scope.set(total_key, total + 1)

    return ModerationResult(
        action=decision.action,
        confidence=decision.confidence,
        reason=decision.reason,
        hitl_triggered=hitl_triggered,
        hitl_decision=hitl_decision,
    )


# ── Stats Skill (called by insights-agent) ───────────────────────────────────
@app.skill(tags=["stats", "orbit"])
async def get_stats() -> dict:
    """Returns moderation action counts for the insights-agent."""
    allow_count = await app.memory.global_scope.get("stats.moderation.allow_count", default=0)
    flag_count = await app.memory.global_scope.get("stats.moderation.flag_count", default=0)
    remove_count = await app.memory.global_scope.get("stats.moderation.remove_count", default=0)
    total = await app.memory.global_scope.get("stats.moderation.total_count", default=0)

    return {
        "allow_count": allow_count,
        "flag_count": flag_count,
        "remove_count": remove_count,
        "total_count": total,
    }


if __name__ == "__main__":
    port = int(os.getenv("MODERATION_AGENT_PORT", 8002))
    app.serve(port=port)
