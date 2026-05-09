using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.Pomodoro.Domain
{
    public class PomodoroSetting
    {
        public required Guid UserId { get; set; }
        public int Timing { get; set; } = 25; // TODO: if timing is 0, it means flow mode

        public string? Sound { get; set; } = null;

        public bool IsCountdown { get; set; } = false;
        public AppUser User { get; set; } = null!;
    }

}
