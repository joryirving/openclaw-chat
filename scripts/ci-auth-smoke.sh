#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
HEADERS_FILE="$TMP_DIR/headers.txt"
SERVER_LOG="$TMP_DIR/server.log"
PORT="${PORT:-3300}"
BASE_URL="http://127.0.0.1:${PORT}"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "${MOCK_WS_PID:-}" ]] && kill -0 "$MOCK_WS_PID" 2>/dev/null; then
    kill "$MOCK_WS_PID" 2>/dev/null || true
    wait "$MOCK_WS_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$ROOT_DIR"

MOCK_WS_PORT="${MOCK_WS_PORT:-3889}"
node -e "const { WebSocketServer } = require('ws'); const wss = new WebSocketServer({ host: '127.0.0.1', port: Number(process.argv[1]) }); wss.on('connection', () => {}); setInterval(() => {}, 1 << 30);" "$MOCK_WS_PORT" >/dev/null 2>&1 &
MOCK_WS_PID=$!
sleep 0.2

export NODE_ENV=development
export PORT
export SESSION_SECRET="ci-session-secret-012345678901234567890123456789"
export OIDC_ENABLED=false
export LOCAL_AUTH_ENABLED=true
export LOCAL_USERS="admin:password123"
export GATEWAY_URL="http://127.0.0.1:9"
export GATEWAY_WS_URL="ws://127.0.0.1:${MOCK_WS_PORT}"
export GATEWAY_AUTH_TOKEN="ci"

node server.js >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for _ in {1..40}; do
  if curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Server exited unexpectedly"
    cat "$SERVER_LOG"
    exit 1
  fi
done

if ! curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1; then
  echo "Server did not become ready"
  cat "$SERVER_LOG"
  exit 1
fi

curl -sS -D "$HEADERS_FILE" -o /dev/null "$BASE_URL/"
tr -d '\r' < "$HEADERS_FILE" > "${HEADERS_FILE}.clean"
grep -Eq '^HTTP/[0-9.]+ 302' "${HEADERS_FILE}.clean"
grep -Eiq '^location: /login' "${HEADERS_FILE}.clean"

curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -D "$HEADERS_FILE" -o /dev/null \
  -X POST "$BASE_URL/login" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'username=admin&password=password123&return_to=/'
tr -d '\r' < "$HEADERS_FILE" > "${HEADERS_FILE}.clean"
grep -Eq '^HTTP/[0-9.]+ 302' "${HEADERS_FILE}.clean"
grep -Eiq '^location: /$' "${HEADERS_FILE}.clean"

AUTH_PAYLOAD="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/auth")"
echo "$AUTH_PAYLOAD" | jq -e '.authenticated == true' >/dev/null

SESSIONS_PAYLOAD="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/sessions")"
echo "$SESSIONS_PAYLOAD" | jq -e '(.sessions | type) == "array"' >/dev/null

echo "Auth-required smoke test passed"
