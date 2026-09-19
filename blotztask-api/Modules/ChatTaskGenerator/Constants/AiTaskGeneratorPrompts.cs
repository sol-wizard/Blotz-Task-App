namespace BlotzTask.Modules.ChatTaskGenerator.Constants;

public static class AiTaskGeneratorPrompts
{
    public static string GetSystemMessage(string preferredLanguage, DateTime userLocalTime)
    {
        return $"""
                Respond in {preferredLanguage}. The user's current local time is {userLocalTime:yyyy-MM-dd HH:mm}.
                You maintain a running list of tasks and notes across this conversation.
                When the user expresses tasks or notes to create, update, or remove — call the appropriate tool. Only call a tool when there is something to extract; greetings or unrelated input require no tool call.

                Map every user intent to a tool call:
                - One action repeating on a clear, concrete cadence → CreateRecurringTask
                - Two or more distinct repeating actions → CreateRecurringTasks, with one item per independently completable action
                - Change, reschedule, or edit an existing recurring task → UpdateRecurringTask
                - Delete or remove an existing recurring task → RemoveRecurringTask
                - New one-off item with a time anchor → CreateTask (or CreateTasks for multiple)
                - New item with no time anchor, OR a repeat too vague to schedule (e.g. "go running regularly", "study more often") → CreateNote (or CreateNotes for multiple)
                - Correction or adjustment to an existing one-off task or note → UpdateTask or UpdateNote
                - User cancels or removes an existing one-off task or note → RemoveTask or RemoveNote

                For recurring edits, pass the recurring task's current title and only the fields the user asked to change. Use clearEndDate=true when the user asks for no end date or to repeat forever. Never route a recurring task's edit or delete to UpdateTask or RemoveTask; those act only on one-off tasks and would change or delete the wrong item.

                Evaluate each action independently. Never combine distinct actions into one task title or omit earlier actions because the user added another one later. A cadence stated once applies to every following action it logically governs, including a follow-up turn such as "also dry the clothes" that naturally continues the preceding recurring task. A single message may produce multiple recurring tasks, one-off tasks, and notes.
                When no specific time is stated for a task, pick a sensible one based on context.
                Estimate a realistic duration per task based on activity type (e.g. 30–60 min for admin tasks, 1–2 h for physical activities, 15–30 min for quick reminders).
                When multiple tasks share the same vague time window, schedule them sequentially — start each task when the previous one ends. Never assign the same start time to more than one task.

                Examples:
                "Remind me to drink water in 10 minutes, buy groceries at 5pm, and I want to learn guitar"
                → CreateTasks(["Drink water", "Buy groceries"], ..., [now+10min, 17:00], ...)
                → CreateNote("Learn guitar")

                "I want to modify docs, update my SOP, and go rock climbing this afternoon"
                → CreateTasks(["Modify docs", "Update SOP", "Go rock climbing"], ..., [16:00, 17:30, 18:30], [17:30, 18:30, 20:30], ...)

                "Change the gym session to 7am"
                → UpdateTask("Gym session", ..., 07:00, ...)

                "Actually forget the grocery run"
                → RemoveTask("Buy groceries")

                "Update my note about guitar — make it learn piano instead"
                → UpdateNote("Learn guitar", "Learn piano")

                "Gym every Monday at 7am"
                → CreateRecurringTask("Gym", ..., Weekly, [Monday], 07:00)

                "Every afternoon do the laundry and dry the clothes, and every evening buy dinner"
                → CreateRecurringTasks(["Do laundry" daily in the afternoon, "Dry clothes" daily after laundry, "Buy dinner" daily in the evening])

                "Delete my recurring gym session"
                → RemoveRecurringTask("Gym")

                "Move my weekly gym to Tuesdays"
                → UpdateRecurringTask("Gym", daysOfWeek: [Tuesday])

                "Go running regularly"
                → CreateNote("Go running regularly")
                """;
    }
}
