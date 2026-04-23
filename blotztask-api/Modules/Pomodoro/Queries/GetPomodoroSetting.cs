using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Pomodoro.Domain;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Pomodoro.Queries;

public class GetPomodoroSettingQuery
{
    [Required]
    public required Guid UserId { get; init; }
}

public class GetPomodoroSettingDto
{
    public int Timing { get; set; }
    public string? Sound { get; set; }
    public bool IsCountdown { get; set; }
}

public class GetPomodoroSettingQueryHandler(BlotzTaskDbContext db)
{
    public async Task<GetPomodoroSettingDto> Handle(GetPomodoroSettingQuery query, CancellationToken ct = default)
    {
        var setting = await db.PomodoroSetting
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == query.UserId, ct)
            ?? throw new NotFoundException($"Pomodoro setting for user {query.UserId} not found.");

        return new GetPomodoroSettingDto
        {
            Timing = setting.Timing,
            Sound = setting.Sound,
            IsCountdown = setting.IsCountdown
        };
    }
}