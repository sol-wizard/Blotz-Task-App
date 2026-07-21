using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Invites.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Invites.Queries;

public class GetMyInviteCodeQuery
{
    public required Guid UserId { get; init; }
}

public class GetMyInviteCodeQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetMyInviteCodeQueryHandler> logger)
{
    private const string Chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 8;

    public async Task<InviteCodeDto> Handle(GetMyInviteCodeQuery query, CancellationToken ct = default)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Id == query.UserId, ct)
            ?? throw new InvalidOperationException("User not found.");

        if (user.InviteCode is not null)
            return new InviteCodeDto { Code = user.InviteCode };

        string code;
        do
        {
            code = GenerateCode();
        } while (await db.AppUsers.AnyAsync(u => u.InviteCode == code, ct));

        user.InviteCode = code;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Generated invite code for user {UserId}", query.UserId);
        return new InviteCodeDto { Code = code };
    }

    private static string GenerateCode()
    {
        var chars = new char[CodeLength];
        for (var i = 0; i < CodeLength; i++)
            chars[i] = Chars[Random.Shared.Next(Chars.Length)];
        return new string(chars);
    }
}
