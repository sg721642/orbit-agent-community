"""
ORBIT — Native Python Mock AgentField Control Plane Server
Runs on port 8080. Handles:
  1. Agent Node Registration & Heartbeats
  2. Routing & Async Reasoner/Skill Execution
  3. Scoped Shared Memory (GET/SET/DELETE/LIST)
  4. Human-in-the-Loop (HITL) Approvals and Webhook callbacks
"""

import asyncio
import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
import httpx
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ControlPlane")

app = FastAPI(
    title="AgentField Local Control Plane (Mock)",
    description="A lightweight Python control plane for local AgentField development without Docker",
    version="1.0.0"
)

# ── IN-MEMORY DATABASE ───────────────────────────────────────────────────────
REGISTRY: Dict[str, Dict[str, Any]] = {}
MEMORY: Dict[str, Dict[str, Any]] = {}
EXECUTIONS: Dict[str, Dict[str, Any]] = {}
PENDING_APPROVALS: Dict[str, Dict[str, Any]] = {}


# ── UTILITIES ────────────────────────────────────────────────────────────────
async def forward_execution(execution_id: str, target: str, input_data: Dict[str, Any]):
    """Background task that calls the target agent and updates the execution state."""
    logger.info(f"Starting execution {execution_id} for target {target}")
    EXECUTIONS[execution_id]["status"] = "running"

    # Target format: node_id.function_name
    if "." not in target:
        logger.error(f"Invalid target format: {target}")
        EXECUTIONS[execution_id].update({
            "status": "failed",
            "error_message": f"Invalid target format: {target}",
            "error": f"Invalid target format: {target}"
        })
        return

    node_id, function_name = target.split(".", 1)

    # Look up agent in registry
    if node_id not in REGISTRY:
        logger.error(f"Agent node '{node_id}' not registered")
        EXECUTIONS[execution_id].update({
            "status": "failed",
            "error_message": f"Agent node '{node_id}' not found in registry",
            "error": f"Agent node '{node_id}' not found"
        })
        return

    agent_info = REGISTRY[node_id]
    base_url = agent_info["base_url"]

    # Find the path for this function from registered reasoners/skills
    path = None
    for r in agent_info.get("reasoners", []):
        if r.get("id") == function_name:
            path = r.get("path") or f"/reasoners/{function_name}"
            break
    if not path:
        for s in agent_info.get("skills", []):
            if s.get("id") == function_name:
                path = s.get("path") or f"/skills/{function_name}"
                break
    if not path:
        # Fallback default path
        path = f"/reasoners/{function_name}"

    url = f"{base_url.rstrip('/')}{path}"
    logger.info(f"Forwarding execution {execution_id} to agent endpoint: {url}")

    # Set up headers with execution context
    headers = {
        "X-Execution-ID": execution_id,
        "X-Run-ID": EXECUTIONS[execution_id]["run_id"],
        "X-Workflow-ID": execution_id,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # We forward the input dictionary flat, which FastAPI maps to function arguments
            response = await client.post(url, json=input_data, headers=headers)
            
            # If the execution was paused for HITL, the agent returns immediately or pauses.
            # In AgentField, if paused, the HTTP request remains open or returns a paused state.
            # In local mode, the agent's server endpoint waits for the pause future to resolve,
            # so this HTTP request will naturally block until approved/rejected.
            
            logger.info(f"Agent response for {execution_id} returned status {response.status_code}")
            
            if response.status_code >= 400:
                EXECUTIONS[execution_id].update({
                    "status": "failed",
                    "error_message": f"Agent returned HTTP {response.status_code}: {response.text}",
                    "error": response.text
                })
            else:
                result_data = response.json()
                EXECUTIONS[execution_id].update({
                    "status": "succeeded",
                    "result": result_data
                })
    except Exception as e:
        logger.error(f"Error executing {execution_id} on agent: {e}")
        # If the execution was paused and then resolved, it might succeed. Double check status first.
        if EXECUTIONS[execution_id]["status"] not in ["succeeded", "paused"]:
            EXECUTIONS[execution_id].update({
                "status": "failed",
                "error_message": str(e),
                "error": str(e)
            })


# ── CORE REGISTRATION & HEARTBEAT ENDPOINTS ──────────────────────────────────
@app.post("/api/v1/nodes/register")
async def register_node(request: Request):
    """Registers an agent node and its skills/reasoners with the control plane."""
    body = await request.json()
    node_id = body.get("node_id")
    if not node_id:
        raise HTTPException(status_code=400, detail="Missing node_id")

    REGISTRY[node_id] = {
        "base_url": body.get("base_url"),
        "version": body.get("version", "1.0.0"),
        "reasoners": body.get("reasoners", []),
        "skills": body.get("skills", []),
        "metadata": body
    }
    logger.info(f"✅ Registered agent node: '{node_id}' at {body.get('base_url')}")
    return {"status": "registered", "node_id": node_id}


@app.post("/api/v1/nodes/{node_id}/heartbeat")
async def node_heartbeat(node_id: str):
    """Simple heartbeat endpoint to keep agent nodes in the 'online' state."""
    if node_id in REGISTRY:
        REGISTRY[node_id]["last_heartbeat"] = uuid.uuid4().hex
    return {"status": "ok"}


@app.post("/api/v1/nodes/{node_id}/shutdown")
async def node_shutdown(node_id: str):
    """Allows nodes to notify the control plane they are shutting down."""
    logger.info(f"Node '{node_id}' requested shutdown")
    if node_id in REGISTRY:
        REGISTRY.pop(node_id)
    return {"status": "ok"}


# ── EXECUTION & ROUTING ENDPOINTS ─────────────────────────────────────────────
@app.post("/api/v1/execute/async/{target}")
async def execute_async(target: str, request: Request):
    """Submits an execution task to be run asynchronously on the target agent."""
    body = await request.json()
    input_data = body.get("input", {})

    execution_id = f"exec_{uuid.uuid4().hex[:16]}"
    run_id = f"run_{uuid.uuid4().hex[:16]}"

    EXECUTIONS[execution_id] = {
        "execution_id": execution_id,
        "run_id": run_id,
        "target": target,
        "status": "pending",
        "input": input_data
    }

    # Start the execution forwarding in a background task
    asyncio.create_task(forward_execution(execution_id, target, input_data))

    return {
        "execution_id": execution_id,
        "run_id": run_id,
        "status": "pending",
        "type": "reasoner"
    }


@app.get("/api/v1/executions/{execution_id}")
async def get_execution(execution_id: str):
    """Polls the status or retrieves the result of a submitted execution."""
    if execution_id not in EXECUTIONS:
        raise HTTPException(status_code=404, detail="Execution not found")
    return EXECUTIONS[execution_id]


# ── MEMORY ENDPOINTS ──────────────────────────────────────────────────────────
@app.post("/api/v1/memory/set")
async def memory_set(request: Request):
    """Stores a key-value pair in global or scoped shared memory."""
    body = await request.json()
    key = body.get("key")
    data = body.get("data")
    if not key:
        raise HTTPException(status_code=400, detail="Missing key")

    MEMORY[key] = {
        "data": data,
        "scope": body.get("scope", "global"),
        "key": key
    }
    logger.info(f"🧠 Memory SET: '{key}' -> {data}")
    return {"status": "ok"}


@app.post("/api/v1/memory/get")
async def memory_get(request: Request):
    """Retrieves a value from shared memory. Returns 404 if key does not exist."""
    body = await request.json()
    key = body.get("key")
    if not key:
        raise HTTPException(status_code=400, detail="Missing key")

    if key not in MEMORY:
        return JSONResponse(status_code=404, content={"error": "Key not found"})

    return {"data": MEMORY[key]["data"]}


@app.post("/api/v1/memory/delete")
async def memory_delete(request: Request):
    """Deletes a key from shared memory."""
    body = await request.json()
    key = body.get("key")
    if not key:
        raise HTTPException(status_code=400, detail="Missing key")

    if key in MEMORY:
        MEMORY.pop(key)
    return {"status": "ok"}


@app.post("/api/v1/memory/list")
async def memory_list():
    """Lists all stored memory keys."""
    return {"keys": list(MEMORY.keys())}


# ── HUMAN-IN-THE-LOOP (HITL) APPROVAL ENDPOINTS ──────────────────────────────
@app.post("/api/v1/agents/{node_id}/executions/{execution_id}/request-approval")
async def request_approval(node_id: str, execution_id: str, request: Request):
    """Called by an agent when an execution pauses and requires human approval."""
    body = await request.json()
    approval_request_id = body.get("approval_request_id")
    if not approval_request_id:
        raise HTTPException(status_code=400, detail="Missing approval_request_id")

    logger.info(f"⚠️ HITL Pause triggered on agent '{node_id}' for execution {execution_id}. Request ID: {approval_request_id}")

    # Set execution status to paused
    if execution_id in EXECUTIONS:
        EXECUTIONS[execution_id]["status"] = "paused"

    # Store the pending approval info
    PENDING_APPROVALS[approval_request_id] = {
        "execution_id": execution_id,
        "node_id": node_id,
        "approval_request_url": body.get("approval_request_url"),
        "callback_url": body.get("callback_url")
    }

    return {"status": "paused", "approval_request_id": approval_request_id}


@app.post("/api/v1/agents/{node_id}/executions/{execution_id}/awaiter-status")
async def awaiter_status(node_id: str, execution_id: str, request: Request):
    """Updates the status of an agent execution awaiter."""
    body = await request.json()
    status = body.get("status")
    if execution_id in EXECUTIONS:
        EXECUTIONS[execution_id]["status"] = status
    return {"status": "ok"}


@app.post("/api/v1/executions/{execution_id}/logs")
async def execution_logs(execution_id: str, request: Request):
    """Receives and stores logs for a specific execution."""
    return {"status": "ok"}


@app.get("/api/v1/admin/approvals")
async def list_approvals():
    """Returns the list of all currently pending approvals."""
    return [{"approval_request_id": k, **v} for k, v in PENDING_APPROVALS.items()]


@app.post("/api/v1/webhooks/approval-response")
@app.post("/api/v1/admin/approvals/{approval_id}")
async def submit_approval(request: Request, approval_id: Optional[str] = None):
    """
    Receives the human decision (Approve/Reject) from the dashboard or test scripts.
    Forwards it to the agent's webhook endpoint to resume agent execution.
    """
    body = await request.json()
    
    # Handle multiple naming conventions (requestId vs approval_request_id)
    req_id = approval_id or body.get("requestId") or body.get("approval_request_id")
    decision = body.get("decision")
    feedback = body.get("feedback", "No feedback provided")

    if not req_id or not decision:
        raise HTTPException(status_code=400, detail="Missing requestId/approval_request_id or decision")

    if req_id not in PENDING_APPROVALS:
        logger.error(f"Pending approval request '{req_id}' not found")
        raise HTTPException(status_code=404, detail=f"Approval request '{req_id}' not found")

    approval_info = PENDING_APPROVALS.pop(req_id)
    execution_id = approval_info["execution_id"]
    node_id = approval_info["node_id"]

    # Retrieve agent's URL to invoke their approval webhook
    if node_id not in REGISTRY:
        raise HTTPException(status_code=500, detail=f"Agent '{node_id}' is no longer registered")

    agent_url = REGISTRY[node_id]["base_url"]
    webhook_url = f"{agent_url.rstrip('/')}/webhooks/approval"

    logger.info(f"✏️ Submitting human decision '{decision}' to agent webhook: {webhook_url}")

    # Forward decision to the agent's FastAPI webhook
    payload = {
        "execution_id": execution_id,
        "approval_request_id": req_id,
        "decision": "approved" if decision.lower() in ["approved", "allow", "yes"] else "rejected",
        "feedback": feedback
    }

    # Update local execution status back to running while the agent completes
    if execution_id in EXECUTIONS:
        EXECUTIONS[execution_id]["status"] = "running"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=payload)
            logger.info(f"Agent webhook response: {response.status_code} - {response.text}")
            return {"status": "success", "agent_notified": True}
    except Exception as e:
        logger.error(f"Failed to notify agent of approval: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to notify agent: {e}")


# ── SERVER RUNNER ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("🚀 Starting Mock AgentField Control Plane on http://localhost:8080...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
