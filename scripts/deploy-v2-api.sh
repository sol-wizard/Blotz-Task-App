#!/usr/bin/env bash
# Deploy the V2 API branch to app-blotz-task-api-v2 (the PM's V2 test lane).
#
#   scripts/deploy-v2-api.sh [branch] [--apply-migrations]
#   default branch: ai-coach-v3-pro
#
# What it does:
#   1. fetches origin/<branch> into a separate worktree (~/.cache/blotz-v2-deploy),
#      so it always deploys pushed commits, never your dirty working tree
#   2. allows only the reviewed conversation, memory and daily budget migrations
#   3. dotnet publish (Release), same command CI uses
#   4. verifies required migrations on shared staging SQL; stops if pending unless
#      --apply-migrations was explicitly supplied
#   5. pushes the zip to the app's Kudu publish endpoint and restarts it
#   6. waits for /health to say Healthy (F1 cold start can take a minute or two)
#
# Needs: az CLI logged in to an account that can see the "BlotzTask" subscription,
#        .NET 10 SDK, zip, jq. Checking migrations also needs Key Vault
#        secret read access and network access to staging SQL. Secrets are
#        fetched at run time and never written to disk.
#
# Why not `az webapp deploy`: it returns 403 against this app (verified 2026-09-13);
# posting straight to Kudu with the same token works.
set -euo pipefail

BRANCH=ai-coach-v3-pro
BRANCH_SET=false
APPLY_MIGRATIONS=false
for ARG in "$@"; do
  case "$ARG" in
    --apply-migrations) APPLY_MIGRATIONS=true ;;
    -*) echo "!! unknown option: $ARG" >&2; exit 2 ;;
    *)
      if [ "$BRANCH_SET" = true ]; then
        echo "!! specify only one branch" >&2; exit 2
      fi
      BRANCH="$ARG"
      BRANCH_SET=true
      ;;
  esac
done
SUB_NAME="BlotzTask"
RG="rg-blotz-task-stag"
APP="app-blotz-task-api-v2"
KEY_VAULT="kv-blotz-task-stag"
REPO="${BLOTZ_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CACHE="$HOME/.cache/blotz-v2-deploy"
WT="$CACHE/src"; OUT="$CACHE/publish"; ZIP="$CACHE/api.zip"
SQL="$CACHE/ai-coach-migration.sql"
PREVIOUS_MIGRATION="20260928030534_AddAiCoachFeedbackAndTraceEvents"

echo "== 0/6 Azure subscription"
SUB=$(az account list --only-show-errors -o tsv --query "[?name=='$SUB_NAME'].id | [0]")
[ -n "$SUB" ] || { echo "!! az cannot see the '$SUB_NAME' subscription. Run: az login" >&2; exit 1; }

echo "== 1/6 fetch origin/$BRANCH"
git -C "$REPO" fetch -q origin "$BRANCH" main
if [ ! -e "$WT/.git" ]; then
  mkdir -p "$CACHE"
  git -C "$REPO" worktree add --detach "$WT" "origin/$BRANCH"
else
  git -C "$WT" checkout -q --detach "origin/$BRANCH"
fi
git -C "$WT" log -1 --format='   deploying: %h %ci %s'

echo "== 2/6 check AI Coach migration"
# Use the checker beside this script to validate the fetched, pushed source.
ALLOWED_OUTPUT=$(bash "$(dirname "${BASH_SOURCE[0]}")/check-v2-migration.sh" "$WT")
AI_MIGRATIONS=()
while IFS= read -r MIGRATION_ID; do
  [ -z "$MIGRATION_ID" ] || AI_MIGRATIONS+=("$MIGRATION_ID")
done <<< "$ALLOWED_OUTPUT"
[ "${#AI_MIGRATIONS[@]}" -eq 3 ] || { echo "!! Expected three allowed V2 migrations." >&2; exit 1; }
ALLOWED_JSON=$(printf '%s\n' "${AI_MIGRATIONS[@]}" | jq -R . | jq -s .)
printf '   allowed migration: %s\n' "${AI_MIGRATIONS[@]}"

echo "== 3/6 dotnet publish (Release)"
rm -rf "$OUT" "$ZIP"
dotnet publish "$WT/blotztask-api/BlotzTask.csproj" -c Release -o "$OUT" --nologo -v q
( cd "$OUT" && zip -qr "$ZIP" . )
echo "   package: $(du -h "$ZIP" | cut -f1)"

echo "== 4/6 check AI Coach migrations on shared staging DB"
DB_CONN=$(az keyvault secret show --subscription "$SUB" --vault-name "$KEY_VAULT" \
  --name sql-connection-string --query value -o tsv --only-show-errors)
[ -n "$DB_CONN" ] || { echo "!! staging SQL connection string is unavailable" >&2; exit 1; }
(
  cd "$WT/blotztask-api"
  dotnet tool restore
  MIGRATION_OUTPUT=$(ConnectionStrings__DefaultConnection="$DB_CONN" ASPNETCORE_ENVIRONMENT=Staging \
    dotnet ef migrations list --json --no-color --configuration Release --no-build)
  if ! MIGRATION_STATE=$(sed -n '/^[[:space:]]*\[/,$p' <<< "$MIGRATION_OUTPUT" \
    | jq -c 'if type == "array" and all(.[]; (.id | type == "string") and ([.applied] | inside([true, false, null]))) then . else error("invalid EF migration list") end') \
    || [ -z "$MIGRATION_STATE" ]; then
    echo "!! could not parse EF migration status; no database changes were made." >&2
    exit 1
  fi
  if ! jq -e --argjson allowed "$ALLOWED_JSON" \
    '[.[].id] as $ids | all($allowed[]; . as $id | [$ids[] | select(. == $id)] | length == 1)' \
    <<< "$MIGRATION_STATE" >/dev/null; then
    echo "!! EF did not list every allowed migration; no database changes were made." >&2
    exit 1
  fi
  UNKNOWN_COUNT=$(jq '[.[] | select(.applied == null)] | length' <<< "$MIGRATION_STATE")
  [ "$UNKNOWN_COUNT" -eq 0 ] || {
    echo "!! EF could not determine the status of $UNKNOWN_COUNT migrations. Check staging SQL access." >&2
    exit 1
  }
  if ! jq -e --arg id "$PREVIOUS_MIGRATION" \
    'any(.[]; .id == $id and .applied == true)' <<< "$MIGRATION_STATE" >/dev/null; then
    echo "!! Required baseline $PREVIOUS_MIGRATION is not applied; no database changes were made." >&2
    exit 1
  fi
  if ! jq -e --arg baseline "$PREVIOUS_MIGRATION" --argjson allowed "$ALLOWED_JSON" \
    '[.[] | select(.id > $baseline) | .id] == $allowed' <<< "$MIGRATION_STATE" >/dev/null; then
    echo "!! Expected only the three allowed migrations after $PREVIOUS_MIGRATION; no database changes were made." >&2
    exit 1
  fi
  PENDING_OTHER=$(jq -r --argjson allowed "$ALLOWED_JSON" \
    '.[] | .id as $id | select(.applied == false and ($allowed | index($id) | not)) | .id' <<< "$MIGRATION_STATE")
  if [ -n "$PENDING_OTHER" ]; then
    echo "   other migrations left pending in staging (will not be applied):"
    printf '%s\n' "$PENDING_OTHER" | sed 's/^/     /'
  fi
  FROM_MIGRATION="$PREVIOUS_MIGRATION"
  PENDING_SEEN=false
  for AI_MIGRATION in "${AI_MIGRATIONS[@]}"; do
    AI_APPLIED=$(jq -r --arg id "$AI_MIGRATION" \
      '.[] | select(.id == $id) | .applied' <<< "$MIGRATION_STATE")
    if [ "$AI_APPLIED" = true ]; then
      [ "$PENDING_SEEN" = false ] || { echo "!! Migration history is out of order." >&2; exit 1; }
    else
      PENDING_SEEN=true
    fi
  done
  if [ "$PENDING_SEEN" = true ] && [ "$APPLY_MIGRATIONS" != true ]; then
    echo "!! Required AI Coach migrations are pending on staging SQL; no database changes were made." >&2
    jq -r --argjson allowed "$ALLOWED_JSON" \
      '.[] | .id as $id | select(.applied == false and ($allowed | index($id))) | "   pending: " + .id' <<< "$MIGRATION_STATE" >&2
    echo "!! Apply the reviewed migrations to staging yourself, then rerun this deployment." >&2
    exit 1
  fi
  for AI_MIGRATION in "${AI_MIGRATIONS[@]}"; do
    AI_APPLIED=$(jq -r --arg id "$AI_MIGRATION" \
      '.[] | select(.id == $id) | .applied' <<< "$MIGRATION_STATE")
    if [ "$AI_APPLIED" = true ]; then
      echo "   $AI_MIGRATION is already applied"
    else
      rm -f "$SQL"
      ConnectionStrings__DefaultConnection="$DB_CONN" ASPNETCORE_ENVIRONMENT=Staging \
        dotnet ef migrations script "$FROM_MIGRATION" "$AI_MIGRATION" \
          --idempotent --configuration Release --no-build -o "$SQL"
      [ -s "$SQL" ] || { echo "!! EF produced no AI Coach migration SQL." >&2; exit 1; }
      echo "   AI Coach migration SQL: $SQL"
      BLOTZ_SQL_CONNECTION_STRING="$DB_CONN" dotnet run \
        --project "$WT/scripts/v2-sql-runner/V2SqlRunner.csproj" \
        --configuration Release -- "$SQL" "$AI_MIGRATION"
      echo "   applied: $AI_MIGRATION"
    fi
    FROM_MIGRATION="$AI_MIGRATION"
  done
)
unset DB_CONN

echo "== 5/6 push to ${APP}"
TOK=$(az account get-access-token --subscription "$SUB" -o tsv --query accessToken)
CODE=$(curl -s -m 600 -o /dev/null -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/octet-stream" \
  --data-binary @"$ZIP" \
  "https://$APP.scm.azurewebsites.net/api/publish?type=zip&restart=true&clean=true")
[ "$CODE" = "200" ] || { echo "!! Kudu returned HTTP $CODE" >&2; exit 1; }
echo "   uploaded and restarted"

echo "== 6/6 wait for /health"
BODY=$(curl -fsS --connect-timeout 10 --max-time 30 \
  --retry 12 --retry-delay 15 --retry-all-errors "https://$APP.azurewebsites.net/health")
echo "   /health => $BODY"
[ "$BODY" = "Healthy" ] || { echo "!! API did not come up healthy" >&2; exit 1; }
echo "OK  https://$APP.azurewebsites.net"
