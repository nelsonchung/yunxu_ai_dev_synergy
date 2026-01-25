#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"

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

tmp_dir="$(mktemp -d)"
admin_cookie="$tmp_dir/admin_cookie.txt"
trap 'rm -rf "$tmp_dir"' EXIT

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

extract_field() {
  local field="$1"
  RESPONSE_JSON="$RESPONSE_BODY" python3 - "$field" <<'PY'
import json, os, sys
field = sys.argv[1]
data = json.loads(os.environ["RESPONSE_JSON"])
value = data.get(field)
if value is None:
    raise SystemExit(f"missing field: {field}")
print(value)
PY
}

assert_project_status() {
  local expected="$1"
  RESPONSE_JSON="$RESPONSE_BODY" python3 - "$expected" <<'PY'
import json, os, sys
expected = sys.argv[1]
data = json.loads(os.environ["RESPONSE_JSON"])
project = data.get("project") or {}
status = project.get("status")
if status != expected:
    raise SystemExit(f"expected status {expected}, got {status}")
PY
}

timestamp="$(date +%s)"

log_step "admin login"
login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$ADMIN_IDENTIFIER" "$ADMIN_PASSWORD")"
response="$(request_json "POST" "/auth/login" "$login_payload" "" "$admin_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "admin login"

log_step "create requirement"
payload="$(
  cat <<JSON
{"title":"專案狀態測試${timestamp}","companyName":"測試公司","projectType":"新系統建置","background":"需求背景","goals":"專案目標","scope":"功能範圍","constraints":"","budgetRange":"50 - 150 萬","timeline":"1-2 個月","specDoc":"尚未準備","attachments":[],"contact":{"name":"測試者","email":"status${timestamp}@example.com","phone":""}}
JSON
)"
response="$(request_json "POST" "/api/requirements" "$payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create requirement"
requirement_id="$(extract_field "id")"

log_step "create project"
project_payload="$(printf '{"requirementId":"%s","name":"%s"}' "$requirement_id" "專案狀態測試專案")"
response="$(request_json "POST" "/api/projects" "$project_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create project"
project_id="$(extract_field "project_id")"

log_step "guard check intake -> requirements_signed (should fail before approval)"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"requirements_signed"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "409" "$RESPONSE_STATUS" "intake guard check"

log_step "approve requirement document"
approve_payload='{"approved":true,"comment":"autotest requirement approval"}'
response="$(request_json "POST" "/api/requirements/$requirement_id/approve" "$approve_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve requirement"

log_step "transition intake -> requirements_signed"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"requirements_signed"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "intake to requirements_signed"
assert_project_status "requirements_signed"

log_step "transition requirements_signed -> architecture_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"architecture_review"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "requirements_signed to architecture_review"
assert_project_status "architecture_review"

log_step "guard check architecture_review -> architecture_signed (should fail before system doc approval)"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"architecture_signed"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "409" "$RESPONSE_STATUS" "architecture guard check"

log_step "create system document"
system_doc_payload='{"type":"system","title":"系統架構 v1","content":"# System\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$system_doc_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create system doc"
system_doc_id="$(extract_field "document_id")"

log_step "approve system document"
response="$(request_json "POST" "/api/projects/$project_id/documents/$system_doc_id/review" '{"approved":true,"comment":"autotest system approval"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve system doc"

log_step "transition architecture_review -> architecture_signed"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"architecture_signed"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "architecture_review to architecture_signed"
assert_project_status "architecture_signed"

log_step "transition architecture_signed -> software_design_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"software_design_review"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "architecture_signed to software_design_review"
assert_project_status "software_design_review"

log_step "create software document"
software_doc_payload='{"type":"software","title":"軟體設計 v1","content":"# Software\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$software_doc_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create software doc"
software_doc_id="$(extract_field "document_id")"

log_step "approve software document"
response="$(request_json "POST" "/api/projects/$project_id/documents/$software_doc_id/review" '{"approved":true,"comment":"autotest software approval"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve software doc"

log_step "transition software_design_review -> software_design_signed"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"software_design_signed"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "software_design_review to software_design_signed"
assert_project_status "software_design_signed"

log_step "transition software_design_signed -> implementation"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"implementation"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "software_design_signed to implementation"
assert_project_status "implementation"

log_step "create test document"
test_doc_payload='{"type":"test","title":"測試計畫 v1","content":"# Test\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$test_doc_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create test doc"
test_doc_id="$(extract_field "document_id")"

log_step "approve test document"
response="$(request_json "POST" "/api/projects/$project_id/documents/$test_doc_id/review" '{"approved":true,"comment":"autotest test approval"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve test doc"

log_step "transition implementation -> system_verification"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"system_verification"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "implementation to system_verification"
assert_project_status "system_verification"

log_step "create delivery document (draft)"
delivery_doc_payload='{"type":"delivery","title":"交付說明 v1","content":"# Delivery\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$delivery_doc_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create delivery doc"
delivery_doc_id="$(extract_field "document_id")"

log_step "transition system_verification -> delivery_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"delivery_review"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "system_verification to delivery_review"
assert_project_status "delivery_review"

log_step "guard check delivery_review -> closed (should fail before delivery approval)"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"closed"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "409" "$RESPONSE_STATUS" "delivery guard check"

log_step "approve delivery document"
response="$(request_json "POST" "/api/projects/$project_id/documents/$delivery_doc_id/review" '{"approved":true,"comment":"autotest delivery approval"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve delivery doc"

log_step "transition delivery_review -> closed"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"closed"}' "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "delivery_review to closed"
assert_project_status "closed"

log_step "delete project"
response="$(request_json "DELETE" "/api/projects/$project_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "delete project"

log_step "delete requirement"
response="$(request_json "DELETE" "/api/requirements/$requirement_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "delete requirement"

log_ok "project status flow"
