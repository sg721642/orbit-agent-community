"""
ORBIT — Seed Data Generator
Populates AgentField shared memory with realistic fake members, posts,
and pre-seeded stats so the demo has real-looking data from the start.

Run AFTER starting all agents:
  python seed_data.py
"""

import os
import json
import random
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

CONTROL_PLANE = os.getenv("AGENTFIELD_SERVER", "http://localhost:8080")

# ── 25 Fake Members ───────────────────────────────────────────────────────────
FAKE_MEMBERS = [
    {"name": "Aarav Sharma",     "bio": "Senior backend engineer at a fintech startup in Bangalore. Love Golang, distributed systems, and Kafka. Speaker at local tech meetups.", "chapter": "Bangalore"},
    {"name": "Priya Nair",       "bio": "ML researcher at IIT Hyderabad. Focused on NLP, transformer architectures, and RAG systems. Open source contributor.", "chapter": "Hyderabad"},
    {"name": "Rohit Verma",      "bio": "Full-stack developer in Pune. React, Node.js, and PostgreSQL. Passionate about developer experience and tooling.", "chapter": "Pune"},
    {"name": "Ananya Singh",     "bio": "Product manager at a SaaS company in Delhi. Into product strategy, user research, and AI product features.", "chapter": "Delhi"},
    {"name": "Kiran Reddy",      "bio": "DevOps engineer at a cloud consulting firm in Hyderabad. Kubernetes, Terraform, AWS. CNCF community member.", "chapter": "Hyderabad"},
    {"name": "Sneha Patel",      "bio": "iOS developer and indie app maker based in Mumbai. Swift, SwiftUI, Core ML. Founder of a small startup.", "chapter": "Mumbai"},
    {"name": "Vikram Gupta",     "bio": "Data engineer at a media company in Delhi. Apache Spark, dbt, Snowflake. Building real-time analytics pipelines.", "chapter": "Delhi"},
    {"name": "Divya Krishnan",   "bio": "Security researcher focused on cloud infrastructure. AWS IAM, zero-trust, penetration testing. Based in Bangalore.", "chapter": "Bangalore"},
    {"name": "Rahul Mehta",      "bio": "Rust developer and WebAssembly enthusiast in Pune. Building high-performance web APIs and edge computing solutions.", "chapter": "Pune"},
    {"name": "Meera Iyer",       "bio": "Frontend architect at a product company in Mumbai. Expert in React, Next.js, and design systems. Accessibility advocate.", "chapter": "Mumbai"},
    {"name": "Arjun Desai",      "bio": "AI/ML engineer specializing in computer vision and robotics. Working on autonomous vehicle perception in Hyderabad.", "chapter": "Hyderabad"},
    {"name": "Lakshmi Rao",      "bio": "Platform engineer building developer platforms at scale in Bangalore. Internal developer portals, Backstage, and golden paths.", "chapter": "Bangalore"},
    {"name": "Nikhil Joshi",     "bio": "Blockchain developer and DeFi protocol researcher. Solidity, Ethereum, and Layer 2 solutions. Based in Mumbai.", "chapter": "Mumbai"},
    {"name": "Pooja Agarwal",    "bio": "Site reliability engineer at a large e-commerce company in Delhi. Observability, chaos engineering, and incident management.", "chapter": "Delhi"},
    {"name": "Siddharth Kumar",  "bio": "Python developer and FastAPI enthusiast in Pune. Building LLM applications and agent frameworks for enterprise clients.", "chapter": "Pune"},
    {"name": "Kavya Menon",      "bio": "AI product designer working at the intersection of UX and machine learning. Based in Bangalore. Loves design thinking workshops.", "chapter": "Bangalore"},
    {"name": "Amitabh Pandey",   "bio": "Data scientist at a healthcare company in Delhi. Clinical NLP, FHIR, and AI-assisted diagnostics. Published researcher.", "chapter": "Delhi"},
    {"name": "Trisha Shah",      "bio": "Startup founder building a B2B SaaS product in Mumbai. Technical background in Python and infrastructure. Fundraising stage.", "chapter": "Mumbai"},
    {"name": "Venkat Subramaniam","bio": "Embedded systems engineer and IoT enthusiast in Hyderabad. C++, FreeRTOS, MQTT. Working on smart agriculture sensors.", "chapter": "Hyderabad"},
    {"name": "Ishaan Malhotra",  "bio": "Cloud architect at a consulting firm in Pune. Multi-cloud strategy, FinOps, and green computing. AWS and GCP certified.", "chapter": "Pune"},
    {"name": "Nisha Bhat",       "bio": "Open source maintainer and community manager in Bangalore. Python ecosystem, documentation, and developer advocacy.", "chapter": "Bangalore"},
    {"name": "Rajesh Pillai",    "bio": "Mobile game developer in Mumbai. Unity, C#, and real-time multiplayer systems. Published 3 games on the Play Store.", "chapter": "Mumbai"},
    {"name": "Shruti Saxena",    "bio": "Research engineer at an AI lab in Delhi working on large language models, RLHF, and model alignment. PhD student.", "chapter": "Delhi"},
    {"name": "Aditya Kulkarni",  "bio": "Infrastructure engineer at a unicorn startup in Pune. Kubernetes operators, GitOps, and platform automation.", "chapter": "Pune"},
    {"name": "Deepa Natarajan",  "bio": "Quantum computing researcher and educator in Hyderabad. Qiskit, quantum algorithms, and bridging theory to industry.", "chapter": "Hyderabad"},
]

# ── Sample Posts (mix of clean, borderline, and spam) ────────────────────────
SAMPLE_POSTS = [
    # Clean posts
    {"text": "Just finished implementing a distributed tracing system with OpenTelemetry in our Go microservices. Happy to share a write-up if anyone's interested!", "expected": "allow"},
    {"text": "Looking for study partners for the CKA exam. Anyone preparing for Kubernetes certification in Bangalore? Let's form a study group!", "expected": "allow"},
    {"text": "Hot take: Rust is overkill for most web APIs. Discuss. (I say this as a Rust developer 😅)", "expected": "allow"},
    {"text": "We're hosting an open source sprint next month in Pune — all skill levels welcome! PRs merged, mentors available. Sign up link in comments.", "expected": "allow"},
    {"text": "Interesting paper on speculative decoding for LLM inference just dropped. Reduces latency by 3x. Has anyone tried this in production?", "expected": "allow"},
    # Borderline posts
    {"text": "Check out my new course on Python! Only $29 today (50% off). Use code ORBIT for extra savings. Limited time only. https://mycourse.io", "expected": "flag"},
    {"text": "Our recruiting platform helps tech companies hire 10x faster. DM me if your team is hiring. We work with startups and enterprises.", "expected": "flag"},
    {"text": "Anyone else feel like the FAANG interview process is broken? I failed 3 Google loops despite having 8 years of experience. Feeling defeated.", "expected": "allow"},
    {"text": "Unpopular opinion: AI tools are making junior devs lazy. Nobody learns fundamentals anymore. We're creating a generation of copy-paste coders.", "expected": "flag"},
    {"text": "FREE webinar tomorrow: How I grew my LinkedIn to 50k followers as a developer. Secrets revealed! Register now: bit.ly/abc123", "expected": "flag"},
    # Clear spam / remove
    {"text": "MAKE MONEY FAST! Join our crypto trading bot that earns $500/day guaranteed! No experience needed. DM NOW before slots fill up! 🚀💰", "expected": "remove"},
    {"text": "Click here to claim your free iPhone 16! Limited offer for ORBIT members only. https://totally-not-phishing.com/free-iphone", "expected": "remove"},
]

# ── Community Health History (for chart) ─────────────────────────────────────
HEALTH_HISTORY = [
    {"date": "2026-06-01", "engagement_score": 45.2, "churn_risk": "medium", "growth_rate": 12.3},
    {"date": "2026-06-05", "engagement_score": 52.8, "churn_risk": "medium", "growth_rate": 15.0},
    {"date": "2026-06-10", "engagement_score": 61.4, "churn_risk": "low",    "growth_rate": 18.7},
    {"date": "2026-06-15", "engagement_score": 68.9, "churn_risk": "low",    "growth_rate": 22.1},
    {"date": "2026-06-20", "engagement_score": 74.3, "churn_risk": "low",    "growth_rate": 25.6},
    {"date": "2026-06-24", "engagement_score": 82.1, "churn_risk": "low",    "growth_rate": 28.3},
]


async def seed_memory():
    """Directly seeds AgentField shared memory via REST API."""
    base = f"{CONTROL_PLANE}/api/v1/memory/global"

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Seed member data
        for i, member in enumerate(FAKE_MEMBERS):
            member_id = f"m{i+1:03d}"
            try:
                await client.post(f"{base}/set", json={
                    "key": f"member.{member_id}.chapter",
                    "value": member["chapter"],
                })
                await client.post(f"{base}/set", json={
                    "key": f"member.{member_id}.interests",
                    "value": member["bio"],
                })
                await client.post(f"{base}/set", json={
                    "key": f"member.{member_id}.name",
                    "value": member["name"],
                })
            except Exception:
                pass  # memory API may differ by version; skip silently

        # Seed aggregate stats
        stats_seeds = {
            "stats.onboarded_count": len(FAKE_MEMBERS),
            "stats.events_recommended": 47,
            "stats.moderation.allow_count": 8,
            "stats.moderation.flag_count": 3,
            "stats.moderation.remove_count": 1,
            "stats.moderation.total_count": 12,
        }
        for key, value in stats_seeds.items():
            try:
                await client.post(f"{base}/set", json={"key": key, "value": value})
            except Exception:
                pass

        # Seed health history for dashboard chart
        try:
            await client.post(f"{base}/set", json={
                "key": "insights.report_history",
                "value": HEALTH_HISTORY,
            })
        except Exception:
            pass


def seed_local_json():
    """Writes seed data to JSON files for the dashboard to consume directly."""
    os.makedirs("data", exist_ok=True)

    # Members
    with open("data/members.json", "w") as f:
        json.dump(FAKE_MEMBERS, f, indent=2)

    # Posts
    with open("data/posts.json", "w") as f:
        json.dump(SAMPLE_POSTS, f, indent=2)

    # Health history
    with open("data/health_history.json", "w") as f:
        json.dump(HEALTH_HISTORY, f, indent=2)

    # Stats summary
    stats = {
        "total_members": len(FAKE_MEMBERS),
        "active_chapters": 5,
        "upcoming_events": 10,
        "community_health_score": 82.1,
        "chapter_breakdown": {
            "Delhi": sum(1 for m in FAKE_MEMBERS if m["chapter"] == "Delhi"),
            "Bangalore": sum(1 for m in FAKE_MEMBERS if m["chapter"] == "Bangalore"),
            "Pune": sum(1 for m in FAKE_MEMBERS if m["chapter"] == "Pune"),
            "Hyderabad": sum(1 for m in FAKE_MEMBERS if m["chapter"] == "Hyderabad"),
            "Mumbai": sum(1 for m in FAKE_MEMBERS if m["chapter"] == "Mumbai"),
        }
    }
    with open("data/stats.json", "w") as f:
        json.dump(stats, f, indent=2)

    print("✅ Seed data written to orbit-agents/data/")
    print(f"   Members: {len(FAKE_MEMBERS)}")
    print(f"   Posts: {len(SAMPLE_POSTS)}")
    print(f"   Health history points: {len(HEALTH_HISTORY)}")
    for chapter, count in stats["chapter_breakdown"].items():
        print(f"   {chapter}: {count} members")


async def main():
    print("🌱 ORBIT Seed Data Generator")
    print("=" * 40)

    # Always write local JSON (for dashboard fallback)
    seed_local_json()

    # Try to also seed AgentField memory directly
    print("\n🔗 Attempting to seed AgentField shared memory...")
    try:
        await seed_memory()
        print("✅ AgentField shared memory seeded!")
    except Exception as e:
        print(f"⚠️  Could not reach AgentField control plane ({e})")
        print("   This is OK — the dashboard uses local JSON files.")
        print("   Re-run after starting agents: python seed_data.py")


if __name__ == "__main__":
    asyncio.run(main())
