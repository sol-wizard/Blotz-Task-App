# Monthly Review — Production-Readiness & Data Improvement Plan

Status: planning notes. Captures the product/data recommendations for taking the
Monthly Review letter from beta to a richer, more accurate, more "understanding"
feature for an ADHD-focused to-do app.

Scope note: this document is **recommendations only**. The only changes already
shipped alongside it are: error-handling parity with Breakdown, AI quota + usage
metering, and moving the feature out of Beta Features into the main Settings menu.

---

## 0. Two correctness issues to fix before adding any new data

These are about the data we *already* send, and they undermine accuracy today.

### 0.1 We filter by the wrong date
The letter is built from tasks filtered by `TaskItem.CreatedAt` (when the task was
typed in). A task created Jan 28 but done Feb 3 belongs in February's story, not
January's.

- **Fix:** filter by `StartTime` (scheduled-in-month) — and, once we have it,
  also include tasks *completed* in the month.
- This matters more than the existing UTC-month-boundary TODO.

### 0.2 `TimeTakenMinutes` is misleading
It is computed as `EndTime - StartTime` — the *calendar block the user reserved*,
not time actually spent. For `SingleTime` tasks it is always `0`. The prompt then
calls it *"planned time (minutes)"* and invites the AI to reason about effort, so
the model will confidently tell users they "spent 30 minutes" on things.

- **Fix:** rename to `PlannedDurationMinutes` and correct the prompt wording so it
  never implies effort/time-spent. There is no real "time taken" signal today
  (see Pomodoro session history in section 2).

---

## 1. Data to feed in — using tables that ALREADY exist (no new build)

The report currently feeds only 6 fields from one table. The biggest accuracy
unlock is just **Labels + the correct date filter**.

| Signal | Source (exists today) | Why it matters for ADHD |
|---|---|---|
| Category / theme | `Label.Name` via `TaskItem.LabelId` | Stop making the AI guess themes from titles — use real categories. |
| Breakdown follow-through | `Subtask` (IsDone ratio per task) | "You broke down 8 tasks and finished most subtasks" — executive-function win. |
| Abandoned tasks | `DeletedTaskItem` + `DeletedAt` in month | Gentle pattern: what got dropped. Handle softly. |
| Procrastination / on-time-ness | `TaskDeadline.DueAt` vs completion | Last-minute patterns are a core ADHD pain point. |
| Habit consistency | `RecurringTask` + generated instances | "You kept your morning routine 18 of 30 days." |
| Peak focus windows | `StartTime` hour-of-day distribution | Users often don't know when they're sharp; this is delightful. |
| Achievements | `UserBadge.EarnedAtUtc` in month | Cheap dopamine; reinforces the warm tone. |

## 2. What to build (priority order)

1. **`CompletedAt` on `TaskItem`** — *highest value/effort ratio, do first.*
   Today `IsDone` is a bool with no timestamp, so we can't say *when* things got
   done, measure on-time vs late, or show momentum across the month. One nullable
   column unlocks half the insights above. (Clean EF migration.)
2. **Pomodoro session history table** — we have `PomodoroSetting` but **no record
   of actual focus sessions**. For a focus app this is the richest possible signal
   ("12 focus sessions, mostly mornings, 3 abandoned early"). Today that data
   evaporates.
3. **1-tap mood / energy check-in** — ADHD is an energy-regulation condition. Even
   a tiny daily 😊/😐/😩 log would make the letter feel like it understands the
   user, not just counts tasks.
4. **Reschedule / snooze counter** — track how many times a task gets moved.
   "You moved 'call dentist' 6 times" is one of the most empathetic, useful
   insights an ADHD app can give.
5. **Fill in `UserProgress`** — it is currently a placeholder for streaks.
   Streaks → "your longest active streak was 9 days."

## 3. How to use what we have better (technique)

**Aggregate in C#, let the AI narrate.** Today we serialize every task row to JSON
and hand it over. LLMs are bad at counting and will hallucinate totals at 100+
tasks — and it is token-expensive (now that quota metering is in place, this is a
direct cost). Instead compute the numbers in the handler and pass:

- a **stats block** (completion rate, busiest day, peak hour, top 3 labels,
  longest active streak, on-time %), **plus**
- a **curated highlights list** (~10 notable tasks: biggest wins, the abandoned
  one, the long-procrastinated one).

The AI then reflects on facts we computed rather than doing arithmetic it is bad
at. More accurate, cheaper, and it scales.

## 4. Prompt fixes (`MonthlyReviewPrompts.cs`)

- Fix the "planned time" wording (see 0.2) — don't imply effort/time-spent.
- Drop the dead line *"Skip external benchmarks/comparisons unless a reliable web
  source supports them"* — this model has no web access, so it is confusing dead
  weight. Replace with a plain "no external comparisons."
- Feed labels + the aggregate block once available, and instruct the model to
  ground claims in the stats.
- **Keep** the "treat incomplete gently / don't invent facts / plain prose" rules —
  they are well-tuned for this audience.

---

## Suggested first backend step

`CompletedAt` on `TaskItem` **+** switching the month filter from `CreatedAt` to
`StartTime`. Small, high-impact, and it unblocks most of the richer insights above.
