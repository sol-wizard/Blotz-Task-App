#!/usr/bin/env bash
# SessionStart: when Claude Code opens in this repo, list the PRs that need you,
# so a PR never gets lost after its Discord post. Two gh calls, no AI.
#   👀 waiting for your review · 🔁 your PR needs changes · ✅ your PR is approved
# Same rules as .claude/skills/pr-review/queue.md. Silent when there's nothing
# to show or gh isn't installed / logged in.
REPO=sol-wizard/Blotz-Task-App
cd "$(dirname "$0")/../.." || exit 0
command -v gh >/dev/null || exit 0
# BLOTZ_GH_USER overrides who "you" are, for a machine with several gh accounts
# (set it under "env" in .claude/settings.local.json).
ME=${BLOTZ_GH_USER:-$(gh api user -q .login 2>/dev/null)}
[ -n "$ME" ] || exit 0
# Tech leads (the list in review-levels.md) also see L3/L4 PRs to review.
TL=false
grep -qE "^- \`$ME\`" .claude/skills/pbi/review-levels.md 2>/dev/null && TL=true

gh pr list -R "$REPO" --state open --limit 100 \
  --json number,title,author,labels,createdAt,isDraft,reviewDecision,reviewRequests --jq "
  def level: ([.labels[].name | select(test(\"^L[1-4]\$\"))][0] // \"no level\");
  def age: ((now - (.createdAt | fromdate)) / 3600 | floor) as \$h
    | if \$h < 24 then \"\(\$h)h\" else \"\(\$h / 24 | floor)d\" end;
  def sentback: .reviewDecision == \"CHANGES_REQUESTED\" and (.reviewRequests | length) == 0;
  def line(\$icon; \$note): \"\(\$icon) #\(.number) · \(.title) · \(level) · \(\$note)\";
  [.[] | select(.isDraft | not)] | sort_by(.createdAt)
  | ([.[] | select(.author.login == \"$ME\")
       | if sentback then line(\"🔁\"; \"changes requested — fix and send it back\")
         elif .reviewDecision == \"APPROVED\" then line(\"✅\"; \"approved — say 'merge my PR'\")
         else empty end]) as \$mine
  | ([.[] | select(.author.login != \"$ME\" and (.author.is_bot | not)
              and (sentback | not) and .reviewDecision != \"APPROVED\"
              and ($TL or (level | test(\"L[34]\") | not)))
       | line(\"👀\"; \"\(.author.login) · waiting \(age)\")]) as \$review
  | if (\$mine + \$review | length) == 0 then empty else
      ((if (\$review | length) > 0 then [\"Waiting for your review:\"] + \$review else [] end)
       + (if (\$mine | length) > 0 then [\"Your PRs:\"] + \$mine else [] end)
       | join(\"\n\")) as \$text
      | {systemMessage: (\"📋 Blotz PRs\n\" + \$text),
         hookSpecificOutput: {hookEventName: \"SessionStart\",
           additionalContext: (\"PRs that need this dev (shown to them at startup). Say 'review #n' / 'merge my PR' flows apply:\n\" + \$text)}}
    end" 2>/dev/null
exit 0
