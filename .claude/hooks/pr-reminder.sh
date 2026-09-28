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
# Tech leads = the list in review-levels.md. They also see L3/L4 PRs to review,
# and L3/L4 only count as approved once the level's rule is met:
# L3 = a tech lead approved, L4 = 2 approvals with at least 1 tech lead.
TLS=$(grep -oE '^- `[^`]+`' .claude/skills/pbi/review-levels.md 2>/dev/null |
  sed -e 's/^- `//' -e 's/`$//' -e 's/.*/"&"/' | paste -sd, -)
TLS="[$TLS]"
TL=false
grep -qE "^- \`$ME\`" .claude/skills/pbi/review-levels.md 2>/dev/null && TL=true

# jq program (gh --jq takes no --arg, so the values are filled in below).
read -r -d '' PROG <<'JQ'
def level: ([.labels[].name | select(test("^L[1-4]$"))][0] // "no level");
def age: ((now - (.createdAt | fromdate)) / 3600 | floor) as $h
  | if $h < 24 then "\($h)h" else "\($h / 24 | floor)d" end;
def sentback: .reviewDecision == "CHANGES_REQUESTED" and (.reviewRequests | length) == 0;
def approvers: [.latestReviews[]? | select(.state == "APPROVED") | .author.login];
def approved:
  approvers as $a | ([$a[] | select(. as $x | __TLS__ | index($x))] | length) as $t
  | if level == "L4" then ($a | length) >= 2 and $t >= 1
    elif level == "L3" then $t >= 1
    else .reviewDecision == "APPROVED" end;
def line($icon; $note): "\($icon) #\(.number) · \(.title) · \(level) · \($note)";
[.[] | select(.isDraft | not)] | sort_by(.createdAt)
| ([.[] | select(.author.login == "__ME__")
     | if sentback then line("🔁"; "changes requested — fix and send it back")
       elif approved then line("✅"; "approved — say 'merge my PR'")
       else empty end]) as $mine
| ([.[] | select(.author.login != "__ME__" and (.author.is_bot | not)
            and (sentback | not) and (approved | not)
            and (__TL__ or (level | test("L[34]") | not)))
     | line("👀"; "\(.author.login) · waiting \(age)")]) as $review
| if ($mine + $review | length) == 0 then empty else
    ((if ($review | length) > 0 then ["Waiting for your review:"] + $review else [] end)
     + (if ($mine | length) > 0 then ["Your PRs:"] + $mine else [] end)
     | join("\n")) as $text
    | {systemMessage: ("📋 Blotz PRs\n" + $text),
       hookSpecificOutput: {hookEventName: "SessionStart",
         additionalContext: ("PRs that need this dev (shown to them at startup). 'review #n' / 'merge my PR' apply:\n" + $text)}}
  end
JQ
PROG=${PROG//__ME__/$ME}
PROG=${PROG//__TLS__/$TLS}
PROG=${PROG//__TL__/$TL}

gh pr list -R "$REPO" --state open --limit 100 \
  --json number,title,author,labels,createdAt,isDraft,reviewDecision,reviewRequests,latestReviews \
  --jq "$PROG" 2>/dev/null
exit 0
