#!/usr/bin/env bash
# Deploy the V2 API branch to app-blotz-task-api-v2 (the PM's V2 test lane).
#
#   scripts/deploy-v2-api.sh [branch]        default: ai-coach-v3-pro
#
# What it does:
#   1. fetches origin/<branch> into a separate worktree (~/.cache/blotz-v2-deploy),
#      so it always deploys pushed commits, never your dirty working tree
#   2. refuses to continue if the branch adds EF migrations vs origin/main -
#      V2 shares the staging database and must not change its schema
#   3. dotnet publish (Release), same command CI uses
#   4. pushes the zip to the app's Kudu publish endpoint and restarts it
#   5. waits for /health to say Healthy (F1 cold start can take a minute or two)
#
# Needs: az CLI logged in to an account that can see the "BlotzTask" subscription,
#        .NET 10 SDK, zip. No secrets live in this file: the token is fetched from
#        az at run time and never written to disk.
#
# Why not `az webapp deploy`: it returns 403 against this app (verified 2026-09-13);
# posting straight to Kudu with the same token works.
set -euo pipefail

BRANCH="${1:-ai-coach-v3-pro}"
SUB_NAME="BlotzTask"
RG="rg-blotz-task-stag"
APP="app-blotz-task-api-v2"
REPO="${BLOTZ_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CACHE="$HOME/.cache/blotz-v2-deploy"
WT="$CACHE/src"; OUT="$CACHE/publish"; ZIP="$CACHE/api.zip"

echo "== 0/5 Azure subscription"
SUB=$(az account list --only-show-errors -o tsv --query "[?name=='$SUB_NAME'].id | [0]")
[ -n "$SUB" ] || { echo "!! az cannot see the '$SUB_NAME' subscription. Run: az login" >&2; exit 1; }

echo "== 1/5 fetch origin/$BRANCH"
git -C "$REPO" fetch -q origin "$BRANCH" main
if [ ! -e "$WT/.git" ]; then
  mkdir -p "$CACHE"
  git -C "$REPO" worktree add --detach "$WT" "origin/$BRANCH"
else
  git -C "$WT" checkout -q --detach "origin/$BRANCH"
fi
git -C "$WT" log -1 --format='   deploying: %h %ci %s'

echo "== 2/5 no new migrations vs origin/main"
if [ -n "$(git -C "$WT" diff --name-only origin/main...HEAD -- '*Migrations*')" ]; then
  echo "!! branch adds migrations; V2 must not change the staging DB schema. Stopping." >&2
  git -C "$WT" diff --name-only origin/main...HEAD -- '*Migrations*' >&2
  exit 1
fi
echo "   none"

echo "== 3/5 dotnet publish (Release)"
rm -rf "$OUT" "$ZIP"
dotnet publish "$WT/blotztask-api/BlotzTask.csproj" -c Release -o "$OUT" --nologo -v q
( cd "$OUT" && zip -qr "$ZIP" . )
echo "   package: $(du -h "$ZIP" | cut -f1)"

echo "== 4/5 push to ${APP}"
TOK=$(az account get-access-token --subscription "$SUB" -o tsv --query accessToken)
CODE=$(curl -s -m 600 -o /dev/null -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/octet-stream" \
  --data-binary @"$ZIP" \
  "https://$APP.scm.azurewebsites.net/api/publish?type=zip&restart=true&clean=true")
[ "$CODE" = "200" ] || { echo "!! Kudu returned HTTP $CODE" >&2; exit 1; }
echo "   uploaded and restarted"

echo "== 5/5 wait for /health"
BODY=$(curl -fsS --retry 12 --retry-delay 15 --retry-all-errors "https://$APP.azurewebsites.net/health")
echo "   /health => $BODY"
[ "$BODY" = "Healthy" ] || { echo "!! API did not come up healthy" >&2; exit 1; }
echo "OK  https://$APP.azurewebsites.net"
