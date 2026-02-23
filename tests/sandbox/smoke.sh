#!/usr/bin/env bash
# Smoke tests for dockwatch-agent running in Docker
# Expects: AGENT_URL and API_KEY environment variables
set -euo pipefail

AGENT_URL="${AGENT_URL:-http://localhost:9999}"
API_KEY="${API_KEY:-dockwatch}"
PASS=0
FAIL=0

check() {
    local desc="$1" method="$2" path="$3" expected_status="$4"
    shift 4
    local body="${1:-}"

    local args=(-s -o /tmp/resp_body -w "%{http_code}" -H "X-Api-Key: ${API_KEY}")
    if [[ "$method" = "POST" ]]; then
        args+=(-X POST -H "Content-Type: application/json")
        [[ -n "$body" ]] && args+=(-d "$body")
    fi

    local status
    status=$(curl "${args[@]}" "${AGENT_URL}${path}")

    if [[ "$status" = "$expected_status" ]]; then
        echo "  PASS  ${desc} (${status})"
        PASS=$((PASS + 1))
    else
        echo "  FAIL  ${desc} — expected ${expected_status}, got ${status}"
        echo "        body: $(cat /tmp/resp_body)"
        FAIL=$((FAIL + 1))
    fi
    return 0
}

echo "=== Dockwatch Agent Smoke Tests ==="
echo "Target: ${AGENT_URL}"
echo ""

echo "--- Health ---"
check "GET /ping" GET "/ping" 200

echo "--- Auth ---"
# No key should 401
status=$(curl -s -o /dev/null -w "%{http_code}" "${AGENT_URL}/api/server/ping")
if [[ "$status" = "401" ]]; then
    echo "  PASS  Rejects missing API key (401)"
    PASS=$((PASS + 1))
else
    echo "  FAIL  Expected 401 without key, got ${status}"
    FAIL=$((FAIL + 1))
fi

echo "--- Server ---"
check "GET /api/server/ping" GET "/api/server/ping" 200
check "GET /api/server/time" GET "/api/server/time" 200

echo "--- Docker ---"
check "GET /api/docker/processList" GET "/api/docker/processList" 200
check "GET /api/docker/container/inspect (no name)" GET "/api/docker/container/inspect" 400
check "GET /api/docker/container/logs (no name)" GET "/api/docker/container/logs" 400

echo "--- Stats ---"
check "GET /api/stats/containers" GET "/api/stats/containers" 200
check "GET /api/stats/metrics" GET "/api/stats/metrics" 200
check "GET /api/stats/overview" GET "/api/stats/overview" 200

echo "--- 405 fallback ---"
check "GET /api/nonexistent" GET "/api/nonexistent" 405

echo "--- Container lifecycle (self) ---"
# Get our own container ID to test inspect/logs/restart
SELF_ID=$(curl -s -H "X-Api-Key: ${API_KEY}" "${AGENT_URL}/api/docker/processList" \
    | grep -o '"Id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ -n "$SELF_ID" ]]; then
    SHORT_ID="${SELF_ID:0:12}"
    check "GET /api/docker/container/inspect" GET "/api/docker/container/inspect?name=${SHORT_ID}" 200
    check "GET /api/docker/container/logs" GET "/api/docker/container/logs?name=${SHORT_ID}" 200
else
    echo "  SKIP  No containers found for lifecycle tests"
fi

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
[[ "$FAIL" -eq 0 ]] || exit 1
