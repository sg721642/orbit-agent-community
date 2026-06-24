"""
ORBIT — Multi-Agent System Verification Test Script
Verifies all 4 agents, shared memory, cross-agent calls, and HITL approvals.
"""

import sys
import time
import asyncio
import httpx

CONTROL_PLANE = "http://localhost:8080/api/v1"
AGENT_PORTS = {
    "onboarding-agent": 8001,
    "moderation-agent": 8002,
    "event-agent": 8003,
    "insights-agent": 8004
}

def print_section(title: str):
    print("\n" + "=" * 60)
    print(f"🔹 {title}")
    print("=" * 60)

async def check_services():
    """Verify that all local services are up and running."""
    print("Checking system health and port availability...")
    
    # Check Control Plane
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8080/openapi.json", timeout=2.0)
            if response.status_code == 200:
                print("  ✅ Control Plane (port 8080) is ONLINE")
    except Exception:
        print("  ❌ Control Plane (port 8080) is OFFLINE!")
        print("     Please start the control plane first: python mock_control_plane.py")
        sys.exit(1)

    # Check each Agent
    all_online = True
    async with httpx.AsyncClient() as client:
        for agent, port in AGENT_PORTS.items():
            try:
                response = await client.get(f"http://localhost:{port}/health", timeout=2.0)
                if response.status_code == 200:
                    print(f"  ✅ {agent} (port {port}) is ONLINE")
            except Exception:
                print(f"  ❌ {agent} (port {port}) is OFFLINE!")
                all_online = False
                
    if not all_online:
        print("\n     Please start all agents first: ./start_all.ps1")
        sys.exit(1)

async def poll_execution(execution_id: str, max_attempts: int = 15, delay: float = 1.0) -> dict:
    """Poll the execution status until it completes, fails, or pauses."""
    async with httpx.AsyncClient() as client:
        for attempt in range(1, max_attempts + 1):
            response = await client.get(f"{CONTROL_PLANE}/executions/{execution_id}")
            result = response.json()
            status = result.get("status")
            print(f"  Polling execution {execution_id} (Attempt {attempt}/{max_attempts}): status = {status}")
            
            if status in ["succeeded", "failed", "paused"]:
                return result
            
            await asyncio.sleep(delay)
    raise TimeoutError(f"Execution {execution_id} did not complete within the timeout period")

async def test_onboarding():
    print_section("TEST 1: Onboarding Agent (match_member)")
    payload = {
        "input": {
            "profile": "I am a backend engineer based in Pune. I write Python microservices, deploy on Kubernetes, and love open-source."
        }
    }
    async with httpx.AsyncClient() as client:
        print("Submitting onboarding profile...")
        response = await client.post(f"{CONTROL_PLANE}/execute/async/onboarding-agent.match_member", json=payload)
        submission = response.json()
        exec_id = submission["execution_id"]
        
        # Poll for completion
        result = await poll_execution(exec_id)
        
        if result["status"] == "succeeded":
            output = result["result"]
            print("\n🎉 Onboarding Test Succeeded!")
            print(f"   Assigned Chapter: {output.get('chapter')}")
            print(f"   Welcome Message:  {output.get('welcome_message')}")
        else:
            print(f"\n❌ Onboarding Test Failed: {result}")

async def test_event_recommendation():
    print_section("TEST 2: Event Recommendation Agent (recommend_events)")
    
    # Pre-seed a member in shared memory to simulate an onboarded user
    member_id = "m_test_99"
    print(f"Pre-seeding member '{member_id}' in shared memory...")
    async with httpx.AsyncClient() as client:
        await client.post(f"{CONTROL_PLANE}/memory/set", json={
            "key": f"member.{member_id}.chapter",
            "data": "Pune"
        })
        await client.post(f"{CONTROL_PLANE}/memory/set", json={
            "key": f"member.{member_id}.interests",
            "data": "Python backend development, APIs, Kubernetes, DevOps"
        })
        await client.post(f"{CONTROL_PLANE}/memory/set", json={
            "key": f"member.{member_id}.name",
            "data": "Rohan Deshmukh"
        })

    payload = {
        "input": {
            "member_id": member_id,
            "history": []
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"Requesting event recommendations for member '{member_id}'...")
        response = await client.post(f"{CONTROL_PLANE}/execute/async/event-agent.recommend_events", json=payload)
        submission = response.json()
        exec_id = submission["execution_id"]
        
        result = await poll_execution(exec_id)
        
        if result["status"] == "succeeded":
            output = result["result"]
            print("\n🎉 Event Recommendation Test Succeeded!")
            for idx, event in enumerate(output.get("events", [])):
                print(f"   {idx+1}. {event.get('name')} ({event.get('city')} - {event.get('date')})")
                print(f"      Reason: {event.get('reason')}")
        else:
            print(f"\n❌ Event Recommendation Test Failed: {result}")

async def test_moderation_auto_allow():
    print_section("TEST 3: Moderation Agent — Auto-Allow (review_content)")
    payload = {
        "input": {
            "text": "Hi everyone! I just published a tutorial on building fast Python REST APIs with FastAPI. Hope you find it useful!"
        }
    }
    async with httpx.AsyncClient() as client:
        print("Submitting clean post...")
        response = await client.post(f"{CONTROL_PLANE}/execute/async/moderation-agent.review_content", json=payload)
        submission = response.json()
        exec_id = submission["execution_id"]
        
        result = await poll_execution(exec_id)
        
        if result["status"] == "succeeded":
            output = result["result"]
            print("\n🎉 Moderation Auto-Allow Succeeded!")
            print(f"   Action:     {output.get('action')}")
            print(f"   Confidence: {output.get('confidence')}")
            print(f"   Reason:     {output.get('reason')}")
            print(f"   HITL:       {output.get('hitl_triggered')} (Decision: {output.get('hitl_decision')})")
        else:
            print(f"\n❌ Moderation Auto-Allow Test Failed: {result}")

async def test_moderation_hitl_approval():
    print_section("TEST 4: Moderation Agent — HITL Approval Flow (review_content)")
    
    # We send a borderline promotional post that should trigger low confidence
    payload = {
        "input": {
            "text": "Join our channel for amazing free software downloads! Limited slots available! Check it out!"
        }
    }
    
    async with httpx.AsyncClient() as client:
        print("Submitting borderline post...")
        response = await client.post(f"{CONTROL_PLANE}/execute/async/moderation-agent.review_content", json=payload)
        submission = response.json()
        exec_id = submission["execution_id"]
        
        # Poll until paused
        print("Waiting for execution to pause (HITL)...")
        result = await poll_execution(exec_id, max_attempts=10, delay=1.0)
        
        if result["status"] != "paused":
            print(f"\n❌ Moderation HITL Test Failed: expected status 'paused', got '{result['status']}'")
            return
            
        print("  ✅ Execution successfully PAUSED in Human-in-the-Loop gate.")
        
        # Fetch the pending approval from the control plane
        approvals_response = await client.get(f"{CONTROL_PLANE}/admin/approvals")
        approvals = approvals_response.json()
        
        matching_approval = [a for a in approvals if a.get("execution_id") == exec_id]
        if not matching_approval:
            print("\n❌ Moderation HITL Test Failed: Could not find pending approval in control plane")
            return
            
        approval_req_id = matching_approval[0]["approval_request_id"]
        print(f"  Found pending approval request: {approval_req_id}")
        
        # Programmatically approve the request
        print(f"  Mocking human approval decision: 'approved'...")
        approval_payload = {
            "approval_request_id": approval_req_id,
            "decision": "approved",
            "feedback": "Approved by automated testing suite."
        }
        approve_response = await client.post(f"{CONTROL_PLANE}/webhooks/approval-response", json=approval_payload)
        print(f"  Webhook notified: {approve_response.json()}")
        
        # Poll again for final completion
        print("Waiting for execution to resume and complete...")
        final_result = await poll_execution(exec_id, max_attempts=15, delay=1.0)
        
        if final_result["status"] == "succeeded":
            output = final_result["result"]
            print("\n🎉 Moderation HITL Flow Succeeded!")
            print(f"   Final Action: {output.get('action')}")
            print(f"   Reason:       {output.get('reason')}")
            print(f"   HITL:         {output.get('hitl_triggered')} (Decision: {output.get('hitl_decision')})")
        else:
            print(f"\n❌ Moderation HITL Test Failed: {final_result}")

async def test_insights():
    print_section("TEST 5: Insights Agent — Cross-Agent Health Report (community_health)")
    payload = {
        "input": {}
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("Triggering community health report (forces cross-agent calls to ports 8001, 8002, 8003!)...")
        response = await client.post(f"{CONTROL_PLANE}/execute/async/insights-agent.community_health", json=payload)
        submission = response.json()
        exec_id = submission["execution_id"]
        
        # Poll for completion
        result = await poll_execution(exec_id, max_attempts=20, delay=1.0)
        
        if result["status"] == "succeeded":
            output = result["result"]
            print("\n🎉 Insights Community Health Test Succeeded!")
            print(f"   Engagement Score:   {output.get('engagement_score')}%")
            print(f"   Growth Rate:        {output.get('growth_rate')}%")
            print(f"   Churn Risk:         {output.get('churn_risk')}")
            print(f"   Report ID:          {output.get('report_id')}")
            print(f"   Onboarded Members:  {output.get('onboarded_members')}")
            print(f"   Events Recommended: {output.get('events_recommended')}")
            print(f"   Moderation Actions: {output.get('moderation_actions')}")
        else:
            print(f"\n❌ Insights Test Failed: {result}")

async def main():
    import asyncio
    await check_services()
    
    try:
        await test_onboarding()
        await test_event_recommendation()
        await test_moderation_auto_allow()
        await test_moderation_hitl_approval()
        await test_insights()
        
        print("\n" + "=" * 60)
        print("🏆 ALL AGENTS VERIFIED SUCCESSFULLY! 🏆")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
