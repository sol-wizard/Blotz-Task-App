#!/usr/bin/env bash
# Deploy the V2 API branch to app-blotz-task-api-v2 (the PM's V2 test lane).
#
#   scripts/deploy-v2-api.sh [branch] [--apply-migrations]
#   default branch: ai-coach-v3-pro
#
# What it does:
#   1. fetches origin/<branch> into a separate worktree (~/.cache/blotz-v2-deploy),
#      so it always deploys pushed commits, never your dirty working tree
#   2. allows only the AI Coach migration that creates two new tables
#   3. dotnet publish (Release), same command CI uses
#   4. with --apply-migrations, applies only that migration to shared staging SQL
#   5. pushes the zip to the app's Kudu publish endpoint and restarts it
#   6. waits for /health to say Healthy (F1 cold start can take a minute or two)
#
# Needs: az CLI logged in to an account that can see the "BlotzTask" subscription,
#        .NET 10 SDK, zip, jq. Applying the migration also needs Key Vault
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
MIGRATIONS_DIR="blotztask-api/Infrastructure/Data/Migrations"
AI_MIGRATION="20260928030534_AddAiCoachFeedbackAndTraceEvents"

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
SOURCE_FOUND=false
DESIGNER_FOUND=false
SNAPSHOT_FOUND=false
while IFS=$'\t' read -r STATUS MIGRATION_PATH; do
  [ -n "$STATUS" ] || continue
  case "$STATUS:$MIGRATION_PATH" in
    "A:$MIGRATIONS_DIR/$AI_MIGRATION.cs") SOURCE_FOUND=true ;;
    "A:$MIGRATIONS_DIR/$AI_MIGRATION.Designer.cs") DESIGNER_FOUND=true ;;
    "M:$MIGRATIONS_DIR/BlotzTaskDbContextModelSnapshot.cs") SNAPSHOT_FOUND=true ;;
    *) echo "!! unexpected migration change: $STATUS $MIGRATION_PATH" >&2; exit 1 ;;
  esac
done < <(git -C "$WT" diff --name-status --no-renames origin/main...HEAD -- "$MIGRATIONS_DIR")
if [ "$SOURCE_FOUND" != true ] || [ "$DESIGNER_FOUND" != true ] || [ "$SNAPSHOT_FOUND" != true ]; then
  echo "!! expected AI Coach migration files and model snapshot change were not found." >&2
  exit 1
fi
UP_OPERATIONS=$(sed -n '/protected override void Up(/,/protected override void Down(/p' \
  "$WT/$MIGRATIONS_DIR/$AI_MIGRATION.cs" | grep -oE 'migrationBuilder\.[[:alpha:]]+' | sort -u)
if [ "$UP_OPERATIONS" != $'migrationBuilder.CreateIndex\nmigrationBuilder.CreateTable' ] || \
   [ "$(grep -c 'migrationBuilder.CreateTable(' "$WT/$MIGRATIONS_DIR/$AI_MIGRATION.cs")" -ne 2 ]; then
  echo "!! AI Coach migration must only create its two tables and indexes." >&2
  exit 1
fi
echo "   additive migration: $AI_MIGRATION"
if [ "$APPLY_MIGRATIONS" != true ]; then
  echo "!! V2 shares the staging DB. Review the migration, then rerun with --apply-migrations." >&2
  exit 1
fi

echo "== 3/6 dotnet publish (Release)"
rm -rf "$OUT" "$ZIP"
dotnet publish "$WT/blotztask-api/BlotzTask.csproj" -c Release -o "$OUT" --nologo -v q
( cd "$OUT" && zip -qr "$ZIP" . )
echo "   package: $(du -h "$ZIP" | cut -f1)"

echo "== 4/6 apply AI Coach migration to shared staging DB"
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
  if ! jq -e --arg id "$AI_MIGRATION" '[.[] | select(.id == $id)] | length == 1' \
    <<< "$MIGRATION_STATE" >/dev/null; then
    echo "!! EF did not list $AI_MIGRATION; no database changes were made." >&2
    exit 1
  fi
  UNKNOWN_COUNT=$(jq '[.[] | select(.applied == null)] | length' <<< "$MIGRATION_STATE")
  [ "$UNKNOWN_COUNT" -eq 0 ] || {
    echo "!! EF could not determine the status of $UNKNOWN_COUNT migrations. Check staging SQL access." >&2
    exit 1
  }
  PENDING_OTHER=$(jq -r --arg id "$AI_MIGRATION" \
    '.[] | select(.id != $id and .applied == false) | .id' <<< "$MIGRATION_STATE")
  [ -z "$PENDING_OTHER" ] || {
    echo "!! older branch migrations are not applied; refusing to change staging SQL:" >&2
    printf '%s\n' "$PENDING_OTHER" >&2
    exit 1
  }
  AI_APPLIED=$(jq -r --arg id "$AI_MIGRATION" \
    '.[] | select(.id == $id) | .applied' <<< "$MIGRATION_STATE")
  if [ "$AI_APPLIED" = true ]; then
    echo "   $AI_MIGRATION is already applied"
  else
    ConnectionStrings__DefaultConnection="$DB_CONN" ASPNETCORE_ENVIRONMENT=Staging \
      dotnet ef database update "$AI_MIGRATION" --configuration Release --no-build
    echo "   applied: $AI_MIGRATION"
  fi
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
BODY=$(curl -fsS --retry 12 --retry-delay 15 --retry-all-errors "https://$APP.azurewebsites.net/health")
echo "   /health => $BODY"
[ "$BODY" = "Healthy" ] || { echo "!! API did not come up healthy" >&2; exit 1; }
echo "OK  https://$APP.azurewebsites.net"
