# ORBIT — Start All Agents (PowerShell)
# Run this script from the orbit-agents/ directory.
#
# Prerequisites:
#   1. pip install -r requirements.txt
#   2. Copy .env.example to .env and fill in your GOOGLE_API_KEY
#   3. Start AgentField control plane first (separate terminal):
#        af server start
#
# Usage:
#   .\start_all.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "🚀 Starting ORBIT AgentField Agents..." -ForegroundColor Cyan
Write-Host ""

# Check .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "   Copy .env.example to .env and add your GOOGLE_API_KEY" -ForegroundColor Yellow
    exit 1
}

# Start Mock Control Plane first
Write-Host "  Starting mock-control-plane on port 8080..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Write-Host '=== mock-control-plane ===' -ForegroundColor White; python mock_control_plane.py" `
    -WorkingDirectory $scriptDir
Start-Sleep -Seconds 3

# Start each agent in a separate window
$agents = @(
    @{ Name="onboarding-agent"; File="agents\onboarding_agent.py"; Port=8001; Color="Green" },
    @{ Name="moderation-agent"; File="agents\moderation_agent.py"; Port=8002; Color="Yellow" },
    @{ Name="event-agent";      File="agents\event_agent.py";      Port=8003; Color="Magenta" },
    @{ Name="insights-agent";   File="agents\insights_agent.py";   Port=8004; Color="Cyan" }
)

foreach ($agent in $agents) {
    Write-Host "  Starting $($agent.Name) on port $($agent.Port)..." -ForegroundColor $agent.Color
    Start-Process powershell -ArgumentList "-NoExit", "-Command",
        "Write-Host '=== $($agent.Name) ===' -ForegroundColor $($agent.Color); python $($agent.File)" `
        -WorkingDirectory $scriptDir
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "✅ All agents started!" -ForegroundColor Green
Write-Host ""
Write-Host "Agent endpoints:" -ForegroundColor White
Write-Host "  onboarding-agent  → http://localhost:8001/reasoners/match_member"
Write-Host "  moderation-agent  → http://localhost:8002/reasoners/review_content"
Write-Host "  event-agent       → http://localhost:8003/reasoners/recommend_events"
Write-Host "  insights-agent    → http://localhost:8004/reasoners/community_health"
Write-Host ""
Write-Host "Next: run .\test_agents.ps1 to verify all reasoners" -ForegroundColor Cyan
