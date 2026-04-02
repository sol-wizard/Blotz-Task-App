using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public class UpdatePomodoroSettingCommand
{
    public Guid UserId { get; set; }
    public required UpdatePomodoroSettingDto PomodoroSetting { get; set; }
}

public class UpdatePomodoroSettingCommandHandler(
    BlotzTaskDbContext db,
    ILogger<UpdatePomodoroSettingCommandHandler> logger)
{
    public async Task<bool> Handle(UpdatePomodoroSettingCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Updating Pomodoro Setting for user {UserId}", command.UserId);

        var pomodorSetting = await db.PomodoroSetting.FindAsync(command.UserId, ct);
        
        if (pomodorSetting == null) throw new Exception($"Pomodoro Setting with userId {command.UserId} not found.");
        
        if (command.PomodoroSetting.Timing <= 0)
        {
            throw new ValidationException("Pomodoro Setting timing must be greater than zero");
        }
        
        pomodorSetting.Timing = command.PomodoroSetting.Timing;
        pomodorSetting.Sound = command.PomodoroSetting.Sound;
        pomodorSetting.IsCountdown = command.PomodoroSetting.IsCountdown;
        db.PomodoroSetting.Update(pomodorSetting);
        await db.SaveChangesAsync(ct);
        
        logger.LogInformation("Pomodoro Setting for user {UserId} updated successfully", command.UserId);

        return true;
    }
}

public class UpdatePomodoroSettingDto
{
    public int Timing { get; set; }
    public string? Sound { get; set; }
    public bool IsCountdown { get; set; }
}