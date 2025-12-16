namespace BlotzTask.Modules.Users.Domain
{
    public class UserPreference
    {
       
        public Guid UserId { get; set; }
        public bool AutoRollover { get; set; } = true;
        public bool UpcomingNotification { get; set; } = true;
        public bool OverdueNotification { get; set; } = false;
        public bool DailyPlanningNotification { get; set; } = true;
        public bool EveningWrapUpNotification { get; set; } = true;
    }
}
