# Unsupported Claims

Do not make these claims from the first-version dataset:

- AI improved retention.
- AI improved task completion.
- AI improved revenue, subscription conversion, or trial conversion.
- App Store source quality drove product activation.
- New user onboarding conversion increased or decreased. The instrumented login steps (sign-in screen, continue tap, login success) and the first-week behaviors in `new_users` may be reported when the snapshot contains them, but post-login onboarding screens remain unmeasured.
- New installs equal App Store downloads.
- Completing a task or using AI in the first week made new users stay, or caused any retention change.
- A month-over-month change for a month whose events only covered part of the month, or a trend from a single month-over-month change.
- A per-task completion rate, from counts of users who created and completed tasks.
- This is a complete feature-usage ranking.
- Notes/Gashapon screen views represent all feature discovery.
- Manual vs AI task creation is a perfect like-for-like comparison.
- AI output quality is proven by generated task count.
- Sessions per AI user is a repeat-use rate or proves how many users returned for another session.
- AI/manual behavior groups represent an AI-to-manual-task conversion path.
- Failure events divided by AI sessions is the AI failure rate without a stable attempt denominator and join.
- Login user exits (`cancelled`, `browser_dismissed`) are Auth0 reliability failures, or a login success rate uses any denominator other than `login_started` attempts.
- A failure stage caused a specific error code when the snapshot lacks their joint distribution.
- Average duration establishes typical or slow-request waiting time, or justifies an unapproved performance target.
- Movement between incomplete boundary weeks proves reliability improved or worsened.
- App Store downloads, PostHog active users, AI users, or AI/manual groups form one conversion funnel.
- Overlapping sessions-containing-voice and sessions-containing-text counts form a mutually exclusive input-mode composition.
- Speculative causes such as missing reminders, weak task-completion value, or first-use friction are observed findings without supporting events.
- A metric that requires new instrumentation or a new denominator is currently measurable.
- Missing App Store metrics equal zero downloads or zero page views.
- Missing PostHog metrics equal zero usage unless the query succeeded and returned zero.

When a PM question needs one of these unsupported claims, omit it from the monthly report. Report the missing event, property, cohort, denominator, or attribution join only when the user explicitly asks for an instrumentation-gap analysis.
