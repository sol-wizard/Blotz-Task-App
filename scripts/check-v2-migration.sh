#!/usr/bin/env bash
# Read-only validation; prints the allowed migration IDs in execution order.
# Can also run against the local checkout after generating the migration:
#   bash scripts/check-v2-migration.sh
set -euo pipefail

REPO="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DIR="blotztask-api/Infrastructure/Data/Migrations"
# Reviewed migration files before consolidating the four conversation migrations.
# Compare to this fixed tree: main also lacks older, unrelated branch migrations.
BASELINE="e197e5fe56d6336c6528332f8404e808562ed37b"
NAME="CreateAiCoachConversationTables"
# Reviewed migrations after the consolidated one, in execution order. Each file is
# pinned by its Git blob hash: any later SQL change must be reviewed, then re-pinned
# here, before this deployment applies it to the shared staging database.
# Fields: migration ID | reviewed hash of <ID>.cs | text the model snapshot must contain.
REVIEWED=(
  '20261021012358_AddUserMemoryAndBackgroundExtraction|4d0cf15220f678027ca679bc5fc8d641d1c7d89e|b.ToTable("UserMemories"'
  '20261025014216_AddAiCoachDailyBudget|4bc87c6ecc09f4b8805f43dacdb0bcffaf2eebba|b.ToTable("AiCoachBudgetCharge"'
  '20261106092800_AddReviewNotificationToUserPreference|651a022143422ec83bba3960d76481c5202eeb72|b.Property<bool>("ReviewNotification")'
  '20261107110142_ReplaceAiCoachSegmentIndexes|ab1f43035e20e900ed055d717f609a2eb0da609c|b.HasIndex("UserId", "EndedAt")'
  '20261107123018_CreateAiCoachToolSetTable|8e4c862c74875acec930cc06fcaf648d389c1f9b|b.ToTable("AiCoachToolSet"'
  '20261107130706_CreateAiCoachTurnSummaryTable|4075848285747fb7f4b54354ec412e025360ae07|b.ToTable("AiCoachTurnSummary"'
  '20261107142110_AddUserIdToAiCoachBudgetCharge|68d510b951ca597dace78288a36837cfecfaa544|b.HasIndex("UserId", "BudgetDate")'
)
REVIEWED_IDS=()
for ENTRY in "${REVIEWED[@]}"; do REVIEWED_IDS+=("${ENTRY%%|*}"); done
export LC_ALL=C

fail() { echo "!! $*" >&2; exit 1; }
git -C "$REPO" cat-file -e "$BASELINE^{commit}" || fail "Migration baseline is unavailable; fetch full Git history."
shopt -s nullglob
SOURCES=("$REPO/$DIR/"*"_$NAME.cs")
[ "${#SOURCES[@]}" -eq 1 ] || fail "Expected exactly one $NAME migration. Generate it from blotztask-api/: dotnet ef migrations add $NAME"
MIGRATION=$(basename "${SOURCES[0]}" .cs)
[[ "$MIGRATION" =~ ^[0-9]{14}_CreateAiCoachConversationTables$ ]] || fail "Unexpected migration ID: $MIGRATION"
[ -f "$REPO/$DIR/$MIGRATION.Designer.cs" ] || fail "Migration Designer file is missing."

OLD_IDS=(
  20261016123206_AddAiCoachConversation
  20261016143306_AddAiCoachMessageTimelineAndSegments
  20261018112751_AddAiCoachDraftConfirmation
  20261019143123_RemoveModeFromAiCoachConversation
)
for OLD_ID in "${OLD_IDS[@]}"; do
  [ ! -e "$REPO/$DIR/$OLD_ID.cs" ] && [ ! -e "$REPO/$DIR/$OLD_ID.Designer.cs" ] || fail "Old migration still exists: $OLD_ID"
done

CHANGES=$(git -C "$REPO" diff --name-status --no-renames "$BASELINE" -- "$DIR")
UNTRACKED=$(git -C "$REPO" ls-files --others --exclude-standard -- "$DIR")
while IFS= read -r PATH_NAME; do
  [ -z "$PATH_NAME" ] || CHANGES+=$'\nA\t'"$PATH_NAME"
done <<< "$UNTRACKED"
SOURCE_FOUND=false; DESIGNER_FOUND=false
FOUND_FILES=""
while IFS=$'\t' read -r STATUS PATH_NAME; do
  [ -n "$STATUS" ] || continue
  case "$STATUS:$PATH_NAME" in
    "A:$DIR/$MIGRATION.cs") SOURCE_FOUND=true ;;
    "A:$DIR/$MIGRATION.Designer.cs") DESIGNER_FOUND=true ;;
    "M:$DIR/BlotzTaskDbContextModelSnapshot.cs") ;;
    A:*)
      ALLOWED=false
      for ID in "${REVIEWED_IDS[@]}"; do
        if [ "$PATH_NAME" = "$DIR/$ID.cs" ] || [ "$PATH_NAME" = "$DIR/$ID.Designer.cs" ]; then ALLOWED=true; fi
      done
      [ "$ALLOWED" = true ] || fail "Unexpected migration change: $STATUS $PATH_NAME"
      FOUND_FILES+="$PATH_NAME"$'\n'
      ;;
    D:*)
      ALLOWED=false
      for OLD_ID in "${OLD_IDS[@]}"; do
        if [ "$PATH_NAME" = "$DIR/$OLD_ID.cs" ] || [ "$PATH_NAME" = "$DIR/$OLD_ID.Designer.cs" ]; then ALLOWED=true; fi
      done
      [ "$ALLOWED" = true ] || fail "Unexpected migration deletion: $PATH_NAME"
      ;;
    *) fail "Unexpected migration change: $STATUS $PATH_NAME" ;;
  esac
done <<< "$CHANGES"
[ "$SOURCE_FOUND" = true ] && [ "$DESIGNER_FOUND" = true ] || fail "Expected new migration files were not found."
for ENTRY in "${REVIEWED[@]}"; do
  ID="${ENTRY%%|*}"; REST="${ENTRY#*|}"; HASH="${REST%%|*}"; MARKER="${REST#*|}"
  grep -Fxq "$DIR/$ID.cs" <<< "$FOUND_FILES" && grep -Fxq "$DIR/$ID.Designer.cs" <<< "$FOUND_FILES" \
    || fail "Expected migration files were not found: $ID"
  [ "$(git hash-object "$REPO/$DIR/$ID.cs")" = "$HASH" ] || fail "$ID differs from the reviewed version."
  grep -Fq "[Migration(\"$ID\")]" "$REPO/$DIR/$ID.Designer.cs" || fail "$ID Designer migration ID does not match."
  grep -Fq "$MARKER" "$REPO/$DIR/BlotzTaskDbContextModelSnapshot.cs" || fail "Model snapshot is missing $MARKER."
done

UP=$(sed -n '/protected override void Up(/,/protected override void Down(/p' "${SOURCES[0]}")
OPERATIONS=$(grep -oE 'migrationBuilder\.[[:alpha:]]+' <<< "$UP" | sort -u || true)
[ "$OPERATIONS" = $'migrationBuilder.CreateIndex\nmigrationBuilder.CreateTable' ] || fail "Up() must only create tables and indexes."
TABLES=$(awk '/migrationBuilder.CreateTable\(/ { table=1; next } table && /name:/ { gsub(/.*name: "/, ""); gsub(/".*/, ""); print; table=0 }' <<< "$UP" | sort)
[ "$TABLES" = $'AiCoachConversation\nAiCoachDraftConfirmation\nAiCoachMessage' ] || fail "Up() must create exactly the three conversation tables."
INDEX_TABLES=$(awk '/migrationBuilder.CreateIndex\(/ { index_table=1; next } index_table && /table:/ { gsub(/.*table: "/, ""); gsub(/".*/, ""); print; index_table=0 }' <<< "$UP" | sort -u)
[ "$INDEX_TABLES" = "$TABLES" ] || fail "Indexes must belong to the three conversation tables."
for TABLE_NAME in AiCoachConversation AiCoachDraftConfirmation AiCoachMessage; do
  grep -Fq "b.ToTable(\"$TABLE_NAME\"" "$REPO/$DIR/BlotzTaskDbContextModelSnapshot.cs" || fail "Model snapshot is missing $TABLE_NAME."
done
grep -Fq "[Migration(\"$MIGRATION\")]" "$REPO/$DIR/$MIGRATION.Designer.cs" || fail "Designer migration ID does not match."
printf '%s\n' "$MIGRATION" "${REVIEWED_IDS[@]}"
