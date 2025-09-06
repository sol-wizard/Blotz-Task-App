using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public class AddUserCommand
{
    [Required]
    public required string Auth0UserId { get; set; }

    [Required, EmailAddress]
    public required string Email { get; set; }

    public string? DisplayName { get; set; }
    public string? PictureUrl  { get; set; }
}

public class AddUserCommandHandler(ILogger<AddUserCommandHandler> logger)
{
    public Task<string> Handle(AddUserCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("User sync received: {Auth0UserId} | {Email} | {DisplayName} | {PictureUrl}",
            command.Auth0UserId, command.Email, command.DisplayName, command.PictureUrl);

        logger.LogDebug("Completed AddUser (log-only) for {Auth0UserId}", command.Auth0UserId);

        return Task.FromResult($"Logged user {command.Auth0UserId}");
    }
}

public sealed class AddUserResult
{
    public required Guid   Id { get; init; }
    public required string Auth0UserId { get; init; }
    public bool IsNew { get; init; }
}