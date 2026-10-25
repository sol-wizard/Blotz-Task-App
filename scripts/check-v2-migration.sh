#!/usr/bin/env bash
# Read-only validation; prints the three allowed migration IDs in execution order.
# Can also run against the local checkout after generating the migration:
#   bash scripts/check-v2-migration.sh
set -euo pipefail

REPO="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DIR="blotztask-api/Infrastructure/Data/Migrations"
# Reviewed migration files before consolidating the four conversation migrations.
# Compare to this fixed tree: main also lacks older, unrelated branch migrations.
BASELINE="e197e5fe56d6336c6528332f8404e808562ed37b"
NAME="CreateAiCoachConversationTables"
MEMORY_MIGRATION="20261021012358_AddUserMemoryAndBackgroundExtraction"
BUDGET_MIGRATION="20261025014216_AddAiCoachDailyBudget"
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
MEMORY_SOURCE_FOUND=false; MEMORY_DESIGNER_FOUND=false
BUDGET_SOURCE_FOUND=false; BUDGET_DESIGNER_FOUND=false
while IFS=$'\t' read -r STATUS PATH_NAME; do
  [ -n "$STATUS" ] || continue
  case "$STATUS:$PATH_NAME" in
    "A:$DIR/$MIGRATION.cs") SOURCE_FOUND=true ;;
    "A:$DIR/$MIGRATION.Designer.cs") DESIGNER_FOUND=true ;;
    "A:$DIR/$MEMORY_MIGRATION.cs") MEMORY_SOURCE_FOUND=true ;;
    "A:$DIR/$MEMORY_MIGRATION.Designer.cs") MEMORY_DESIGNER_FOUND=true ;;
    "A:$DIR/$BUDGET_MIGRATION.cs") BUDGET_SOURCE_FOUND=true ;;
    "A:$DIR/$BUDGET_MIGRATION.Designer.cs") BUDGET_DESIGNER_FOUND=true ;;
    "M:$DIR/BlotzTaskDbContextModelSnapshot.cs") ;;
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
[ "$MEMORY_SOURCE_FOUND" = true ] && [ "$MEMORY_DESIGNER_FOUND" = true ] || fail "Expected memory migration files were not found."
[ "$BUDGET_SOURCE_FOUND" = true ] && [ "$BUDGET_DESIGNER_FOUND" = true ] || fail "Expected budget migration files were not found."
[ "$(git hash-object "$REPO/$DIR/$BUDGET_MIGRATION.cs")" = "4bc87c6ecc09f4b8805f43dacdb0bcffaf2eebba" ] || fail "Budget migration differs from the reviewed version."
grep -Fq "[Migration(\"$BUDGET_MIGRATION\")]" "$REPO/$DIR/$BUDGET_MIGRATION.Designer.cs" || fail "Budget Designer migration ID does not match."
grep -Fq 'b.ToTable("AiCoachBudgetCharge"' "$REPO/$DIR/BlotzTaskDbContextModelSnapshot.cs" || fail "Model snapshot is missing AiCoachBudgetCharge."
# Pin the reviewed memory migration, including its two added columns and seed
# update. Any later SQL change must be reviewed before this deployment allows it.
[ "$(git hash-object "$REPO/$DIR/$MEMORY_MIGRATION.cs")" = "4d0cf15220f678027ca679bc5fc8d641d1c7d89e" ] || fail "Memory migration differs from the reviewed version."
grep -Fq "[Migration(\"$MEMORY_MIGRATION\")]" "$REPO/$DIR/$MEMORY_MIGRATION.Designer.cs" || fail "Memory Designer migration ID does not match."
grep -Fq 'b.ToTable("UserMemories"' "$REPO/$DIR/BlotzTaskDbContextModelSnapshot.cs" || fail "Model snapshot is missing UserMemories."

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
printf '%s\n' "$MIGRATION" "$MEMORY_MIGRATION" "$BUDGET_MIGRATION"
