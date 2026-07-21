namespace BlotzTask.Modules.Invites.DTOs;

public class InviteCodeDto
{
    public required string Code { get; init; }
}

public class RedeemInviteCodeRequest
{
    public required string Code { get; init; }
}
