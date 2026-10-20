# Screenshots on a PBI

Used by `implement.md` (taking them) and `update.md` (putting them in the note). The AI takes, checks and uploads them — never ask the dev to attach files on GitHub.

## When

Whenever the user can see the change: 1–2, the states that show it best (e.g. before and after).

## Where they come from

They live in `.pbi-explain/<n>/` (gitignored — `artifacts/` is not).

- **The AI takes them** with `real-device-test`: `agent-device screenshot .pbi-explain/<n>/<state>.png`. When the change is already in a staging build, drive the TestFlight app instead of the dev build — `agent-device open com.Blotz.BlotzTask.staging --platform ios --udid <UDID>` needs only the phone rows of the readiness gate (1–5 and 9), no Metro or backend.
- **The dev took them on their phone** → ask them to send them in chat, and copy them into that folder.

## Check

Look at each one: no personal email or real tasks on screen. Retake if there are.

## Upload

Branch `assets/pbi-<n>-<slug>` in the private repo holds the screenshots only and is never merged (same as #1592). Skip the `git/refs` line if the branch already exists. Files already on the branch are skipped, so re-running after adding one is safe — but a changed screenshot needs a new name.

```bash
R=repos/Blotz-Org/Blotz-Task-App-Private; B=assets/pbi-<n>-<slug>; D=.pbi-explain/<n>
gh api $R/git/refs -f ref=refs/heads/$B -f sha=$(gh api $R/git/ref/heads/main --jq .object.sha) --jq .ref
for f in $(find $D -maxdepth 1 -name '*.png'); do
  gh api "$R/contents/backlog/assets/<n>/$(basename "$f")?ref=$B" --silent 2>/dev/null && { echo "already there: $f"; continue; }
  sips --resampleWidth 600 "$f" >/dev/null   # phone shots are 1–3 MB; 600 px is plenty at width 300
  jq -n --rawfile content <(base64 < "$f" | tr -d '\n') --arg branch $B --arg message "docs: screenshots for PBI #<n>" \
    '{message:$message,branch:$branch,content:$content}' \
    | gh api -X PUT $R/contents/backlog/assets/<n>/$(basename "$f") --input - --jq '"\(.content.path) \(.content.size)"'
done
```

## Embed in the note

One row under the note's text: every `<img>` on a single line, separated by spaces (a line break between them stacks them).

```html
<img width="300" alt="<what it shows>" src="https://github.com/Blotz-Org/Blotz-Task-App-Private/blob/assets/pbi-<n>-<slug>/backlog/assets/<n>/<file>.png?raw=true" />
```
