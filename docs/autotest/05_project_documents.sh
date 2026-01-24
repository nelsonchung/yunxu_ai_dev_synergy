#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
DATA_PROJECTS_FILE="${DATA_PROJECTS_FILE:-$ROOT_DIR/server/data/projects.json}"

# Optional defaults for local testing (fill in if you want no env vars).
DEFAULT_ADMIN_IDENTIFIER=""
DEFAULT_ADMIN_PASSWORD=""

ADMIN_IDENTIFIER="${ADMIN_IDENTIFIER:-$DEFAULT_ADMIN_IDENTIFIER}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$DEFAULT_ADMIN_PASSWORD}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for JSON checks."
  exit 1
fi
if [ -z "$ADMIN_IDENTIFIER" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "Set ADMIN_IDENTIFIER and ADMIN_PASSWORD (or edit DEFAULT_ADMIN_* in this script)."
  exit 1
fi

log_step() {
  echo "-- $1"
}

log_ok() {
  echo "OK: $1"
}

request_json() {
  local method="$1"
  local path="$2"
  local data="${3-}"
  local cookie_in="${4-}"
  local cookie_out="${5-}"
  local args=(-sS -w $'\n__STATUS__%{http_code}' -X "$method")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  if [ -n "$cookie_in" ]; then
    args+=(-b "$cookie_in")
  fi
  if [ -n "$cookie_out" ]; then
    args+=(-c "$cookie_out")
  fi
  curl "${args[@]}" "$API_BASE_URL$path"
}

parse_response() {
  local response="$1"
  RESPONSE_BODY="${response%$'\n__STATUS__'*}"
  RESPONSE_STATUS="${response##*__STATUS__}"
}

assert_status() {
  local expected="$1"
  local actual="$2"
  local context="$3"
  if [ "$expected" != "$actual" ]; then
    echo "FAIL: $context (expected $expected, got $actual)"
    echo "$RESPONSE_BODY"
    exit 1
  fi
}

timestamp="$(date +%s)"
title="M2需求${timestamp}"

tmp_dir="$(mktemp -d)"
admin_cookie="$tmp_dir/admin_cookie.txt"
trap 'rm -rf "$tmp_dir"' EXIT

log_step "admin login"
login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$ADMIN_IDENTIFIER" "$ADMIN_PASSWORD")"
response="$(request_json "POST" "/auth/login" "$login_payload" "" "$admin_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "admin login"

log_step "create requirement"
payload="$(
  cat <<JSON
{"title":"$title","companyName":"測試公司","projectType":"系統擴充","background":"需求背景","goals":"專案目標","scope":"功能範圍","constraints":"","budgetRange":"150 - 300 萬","timeline":"3-6 個月","specDoc":"尚未準備","attachments":[],"contact":{"name":"測試者","email":"tester${timestamp}@example.com","phone":""}}
JSON
)"
response="$(request_json "POST" "/api/requirements" "$payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create requirement"

requirement_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["id"])
PY
)"

log_step "create project"
project_payload="$(printf '{"requirementId":"%s","name":"%s"}' "$requirement_id" "文件中心測試專案")"
response="$(request_json "POST" "/api/projects" "$project_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create project"

project_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["project_id"])
PY
)"

log_step "create project doc v1"
doc_payload='{"type":"system","title":"系統文件 v1","content":"# 系統文件\\n版本一內容","version_note":"初版","status":"draft"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$doc_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create project doc v1"

doc1_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["document_id"])
PY
)"

log_step "create project doc v2"
doc_payload='{"type":"system","title":"系統文件 v2","content":"# 系統文件\\n版本二內容","version_note":"更新流程","status":"pending_approval"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$doc_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create project doc v2"

doc2_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["document_id"])
PY
)"

log_step "list project documents"
response="$(request_json "GET" "/api/projects/$project_id/documents" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "list project documents"

RESPONSE_JSON="$RESPONSE_BODY" python3 - "$doc1_id" "$doc2_id" <<'PY'
import json,os,sys
data=json.loads(os.environ["RESPONSE_JSON"])
doc1=sys.argv[1]
doc2=sys.argv[2]
docs=data.get("documents",[])
ids={doc.get("id") for doc in docs}
if doc1 not in ids or doc2 not in ids:
    raise SystemExit("FAIL: project documents not found")
PY

log_step "verify document content"
response="$(request_json "GET" "/api/projects/$project_id/documents/$doc1_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "get project doc v1"
RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
content=data.get("content","")
if "版本一內容" not in content:
    raise SystemExit("FAIL: v1 content mismatch")
PY

response="$(request_json "GET" "/api/projects/$project_id/documents/$doc2_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "get project doc v2"
RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
content=data.get("content","")
if "版本二內容" not in content:
    raise SystemExit("FAIL: v2 content mismatch")
PY

log_step "verify project stored"
python3 - "$DATA_PROJECTS_FILE" "$project_id" <<'PY'
import json,sys
path=sys.argv[1]
pid=sys.argv[2]
with open(path,"r",encoding="utf-8") as f:
    data=json.load(f)
if not any(item.get("id")==pid for item in data):
    raise SystemExit("FAIL: project not found in store")
PY

log_ok "project documents flow"
