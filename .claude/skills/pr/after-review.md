# After review: send it back

Use when a reviewer requested changes and the dev wants to fix them. The goal is that the reviewer never has to be chased: every comment gets an answer, and the review is re-requested on GitHub, which notifies the reviewer and flips the PR's Discord card back to 👀.

1. **Find what's open.**
   - Reviewers waiting on a fix, meaning anyone whose **latest** review is "changes requested":
     `gh pr view --json reviews --jq '[.reviews | group_by(.author.login)[] | last | select(.state == "CHANGES_REQUESTED") | .author.login]'`
     Many reviewers here leave comments with plain **Comment** instead of **Request changes**, so this list is often empty. Then the reviewers to re-request are the authors of the unresolved threads below.
   - Unresolved threads, with each thread's id and first comment's id:
     ```
     gh api graphql -F owner=sol-wizard -F repo=Blotz-Task-App -F n=<PR number> -f query='
       query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){
         reviewThreads(first:100){nodes{id isResolved path line
           comments(first:1){nodes{databaseId author{login} body}}}}}}}' \
       --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved | not)'
     ```
   - Top-level review bodies too (`gh pr view --comments`) — some reviewers put the request there.

2. **Fix each point** with the dev, following the skill that fits the change (`backend-changes`, `database-migrations`, …). If the dev disagrees with a comment, don't change the code — the reply says why instead.

3. **Draft one reply per thread**: what changed and where (a commit or file), or why it was left as is. One or two sentences.

4. **Confirm.** Show the dev the replies, the threads to resolve, and who will be re-requested. **Nothing is posted until they approve** — replies and re-requests notify real people.

5. **Send it back.** On approval, in this order:
   - Push the fixes.
   - Reply to each thread: `gh api repos/sol-wizard/Blotz-Task-App/pulls/<n>/comments/<comment databaseId>/replies -f body=<reply>`
   - Resolve the threads that were fixed, not the ones you pushed back on (the reviewer decides those): `gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -F id=<thread id>`
   - Re-request review from each reviewer found in step 1: `gh pr edit <n> --add-reviewer <login>`. This is the one action the reviewer is notified by, and it flips the PR's Discord card back to 👀 — never skip it.

6. **Reply with the PR URL and who was re-requested.**

## Notes

- Replies, resolves and re-requests post under the dev's GitHub account and notify real people — that's why step 4 comes first.
- Re-requesting a reviewer here is part of the job, unlike *Do not add reviewers unless asked* when opening a PR.
