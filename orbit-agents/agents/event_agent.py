"""
ORBIT — Event Agent
AgentField Features: Reasoner, Shared Memory (global scope read + write)

Endpoint: POST /reasoners/recommend_events
Input:    { "member_id": "<str>", "history": ["event1", "event2", ...] }
Output:   { "events": [ { "name", "date", "city", "tags" }, ... ] }
"""

import os
from typing import List
from dotenv import load_dotenv
from agentfield import Agent, AIConfig
from pydantic import BaseModel

load_dotenv()

# ── Agent Setup ───────────────────────────────────────────────────────────────
app = Agent(
    node_id="event-agent",
    description="Recommends upcoming ORBIT tech events based on member interests",
    version="1.0.0",
    agentfield_server=os.getenv("AGENTFIELD_SERVER", "http://localhost:8080"),
    ai_config=AIConfig(
        model=os.getenv("LLM_MODEL", "gemini/gemini-2.5-flash"),
        api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.5,
    ),
    dev_mode=True,
    tags=["orbit", "events"],
)

# ── Hardcoded Sample Events (8-10 across 5 cities) ───────────────────────────
SAMPLE_EVENTS = [
    {"name": "Delhi AI Builders Meetup",         "date": "2026-07-05", "city": "Delhi",     "tags": ["AI", "LLMs", "Machine Learning"]},
    {"name": "Bangalore Cloud Native Day",        "date": "2026-07-12", "city": "Bangalore", "tags": ["Kubernetes", "DevOps", "Cloud"]},
    {"name": "Pune Rust & Systems Workshop",      "date": "2026-07-19", "city": "Pune",      "tags": ["Rust", "Systems Programming", "WebAssembly"]},
    {"name": "Hyderabad Data Engineering Summit", "date": "2026-07-26", "city": "Hyderabad", "tags": ["Data Engineering", "Apache Spark", "dbt"]},
    {"name": "Mumbai Startup Pitch Night",        "date": "2026-08-02", "city": "Mumbai",    "tags": ["Startups", "Funding", "Product"]},
    {"name": "Delhi Web3 & Blockchain Hackathon", "date": "2026-08-09", "city": "Delhi",     "tags": ["Web3", "Blockchain", "DeFi", "Solidity"]},
    {"name": "Bangalore Open Source Sprint",      "date": "2026-08-16", "city": "Bangalore", "tags": ["Open Source", "Python", "Go", "Contributing"]},
    {"name": "Pune DevOps & Platform Eng Day",    "date": "2026-08-23", "city": "Pune",      "tags": ["DevOps", "Platform Engineering", "Docker", "CI/CD"]},
    {"name": "Hyderabad GenAI & RAG Summit",      "date": "2026-08-30", "city": "Hyderabad", "tags": ["GenAI", "RAG", "Vector Databases", "LangChain"]},
    {"name": "Mumbai Frontend & UX Conference",   "date": "2026-09-06", "city": "Mumbai",    "tags": ["React", "TypeScript", "UX Design", "Frontend"]},
]

# ── Output Schema ─────────────────────────────────────────────────────────────
class EventItem(BaseModel):
    name: str
    date: str
    city: str
    tags: List[str]
    reason: str  # why this event suits the member

class EventRecommendations(BaseModel):
    events: List[EventItem]


# ── Reasoner ─────────────────────────────────────────────────────────────────
@app.reasoner(tags=["events", "recommendations"])
async def recommend_events(member_id: str, history: list = []) -> EventRecommendations:
    """
    Recommends 2-3 upcoming events based on member interests and attendance history.

    AgentField features used:
      - Reasoner (@app.reasoner): AI-powered function with typed output
      - Shared Memory (app.memory.global_scope): reads member chapter/interests,
        writes recommendation counts for insights-agent
    """

    # ── Read member profile from shared memory (written by onboarding-agent) ──
    member_chapter = await app.memory.global_scope.get(
        f"member.{member_id}.chapter", default=None
    )
    member_interests = await app.memory.global_scope.get(
        f"member.{member_id}.interests", default="general tech"
    )

    # ── AI event recommendation ───────────────────────────────────────────────
    import json
    events_json = json.dumps(SAMPLE_EVENTS, indent=2)

    result = await app.ai(
        system=(
            "You are ORBIT's event recommendation engine. "
            "Select exactly 2-3 events from the provided list that best match the member's "
            "interests and chapter location. Prefer events in their chapter city if available. "
            "For each event, add a brief personalised 'reason' (1 sentence) explaining why "
            "this event suits the member. Return valid JSON only."
        ),
        user=(
            f"Member ID: {member_id}\n"
            f"Chapter: {member_chapter or 'Any city'}\n"
            f"Interests: {member_interests}\n"
            f"Past events attended: {history or ['none yet']}\n\n"
            f"Available upcoming events:\n{events_json}"
        ),
        schema=EventRecommendations,
    )

    # ── Shared Memory write (for insights-agent) ──────────────────────────────
    rec_count = await app.memory.global_scope.get("stats.events_recommended", default=0)
    await app.memory.global_scope.set("stats.events_recommended", rec_count + len(result.events))

    return result


# ── Stats Skill (called by insights-agent) ───────────────────────────────────
@app.skill(tags=["stats", "orbit"])
async def get_stats() -> dict:
    """Returns event recommendation counts for the insights-agent."""
    count = await app.memory.global_scope.get("stats.events_recommended", default=0)
    return {"events_recommended_count": count}


if __name__ == "__main__":
    port = int(os.getenv("EVENT_AGENT_PORT", 8003))
    app.serve(port=port)
