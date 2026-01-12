namespace BlotzTask.Modules.Users.Domain
{
    public class PomodoroSetting
    {
        public required Guid UserId { get; set; }
        public int Timing { get; set; } = 25;

        public string? Sound { get; set; } = null;

        public bool IsCountdown { get; set; } = false;
        public AppUser User { get; set; } = null!;
    }

}
