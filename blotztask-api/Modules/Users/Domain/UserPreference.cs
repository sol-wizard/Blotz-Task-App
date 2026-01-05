using BlotzTask.Modules.Users.Enums;

namespace BlotzTask.Modules.Users.Domain
{
    public class UserPreference
    {
        public required Guid UserId { get; set; }
        public bool AutoRollover { get; set; } = true;
        public bool UpcomingNotification { get; set; } = true;
        public bool OverdueNotification { get; set; } = true;
        public bool DailyPlanningNotification { get; set; } = false;
        public bool EveningWrapUpNotification { get; set; } = false;
        public Language PreferredLanguage { get; set; } = Language.En;
    }
}
