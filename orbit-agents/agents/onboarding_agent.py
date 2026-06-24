"""
ORBIT — Onboarding Agent
AgentField Features: Reasoner, Shared Memory (global scope write)

Endpoint: POST /reasoners/match_member
Input:    { "profile": "<free-text bio>" }
Output:   { "chapter": "<city>", "welcome_message": "<string>" }
"""

import os
from dotenv import load_dotenv
from agentfield import Agent, AIConfig
from pydantic import BaseModel

load_dotenv()

# ── Agent Setup ──────────────────────────────────────────────────────────────
app = Agent(
    node_id="onboarding-agent",
    description="Matches new ORBIT members to city chapters and generates welcome messages",
    version="1.0.0",
    agentfield_server=os.getenv("AGENTFIELD_SERVER", "http://localhost:8080"),
    ai_config=AIConfig(
        model=os.getenv("LLM_MODEL", "gemini/gemini-2.5-flash"),
        api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.7,
    ),
    dev_mode=True,
    tags=["orbit", "onboarding"],
)

CHAPTERS = ["Delhi", "Bangalore", "Pune", "Hyderabad", "Mumbai"]

# ── Output Schema ─────────────────────────────────────────────────────────────
class MemberMatch(BaseModel):
    chapter: str          # one of the 5 city chapters
    welcome_message: str  # personalized welcome string (2-3 sentences)


# ── Reasoner ─────────────────────────────────────────────────────────────────
@app.reasoner(tags=["onboarding"])
async def match_member(profile: str) -> MemberMatch:
    """
    Takes a free-text member bio/interests and returns the best-fit city chapter
    plus a short personalized welcome message.

    AgentField features used:
      - Reasoner (@app.reasoner): AI-powered function with typed output
      - Shared Memory (app.memory.global_scope): stores member count for insights-agent
    """

    # ── AI call with structured output ───────────────────────────────────────
    result = await app.ai(
        system=(
            "You are ORBIT's community onboarding assistant. "
            "ORBIT is a tech community with chapters in 5 Indian cities: "
            "Delhi, Bangalore, Pune, Hyderabad, Mumbai. "
            "Analyse the member's profile and:\n"
            "1. Choose the single best-fit chapter from the 5 cities above.\n"
            "2. Write a warm, specific 2-sentence welcome message that references "
            "   something from their bio and mentions a real benefit of that chapter.\n"
            "Return ONLY valid JSON matching the schema."
        ),
        user=f"Member profile:\n{profile}",
        schema=MemberMatch,
    )

    # ── Shared Memory write (for insights-agent) ──────────────────────────────
    # Increment total onboarded count in global scope
    count = await app.memory.global_scope.get("stats.onboarded_count", default=0)
    await app.memory.global_scope.set("stats.onboarded_count", count + 1)

    # Store latest chapter assignment for dashboard queries
    import hashlib
    member_key = hashlib.md5(profile.encode()).hexdigest()[:8]
    await app.memory.global_scope.set(
        f"member.{member_key}.chapter", result.chapter
    )

    return result


# ── Stats Skill (called by insights-agent via cross-agent call) ───────────────
@app.skill(tags=["stats", "orbit"])
async def get_stats() -> dict:
    """Returns onboarding stats for the insights-agent."""
    count = await app.memory.global_scope.get("stats.onboarded_count", default=0)
    return {"onboarded_count": count}


if __name__ == "__main__":
    port = int(os.getenv("ONBOARDING_AGENT_PORT", 8001))
    app.serve(port=port)
