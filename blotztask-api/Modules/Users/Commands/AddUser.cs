using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public sealed record SyncUserCommand(JsonElement User);

public sealed class AddUserResult
{
    public required Guid Id { get; init; }
    public required string Auth0UserId { get; init; }
}

public class SyncUserCommandHandler(
    BlotzTaskDbContext db,
    ILogger<SyncUserCommandHandler> logger)
{
    public async Task<AddUserResult> Handle(SyncUserCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Starting user sync at {Time}", DateTime.UtcNow);

        // Log the raw JSON 'user' for troubleshooting if needed:
        logger.LogDebug("Raw user payload: {@User}", command.User);

        var user = command.User;

        string? TryGetString(JsonElement source, string name)
        {
            return source.TryGetProperty(name, out var el) && el.ValueKind != JsonValueKind.Null
                ? el.GetString()
                : null;
        }

        string? Get(string name)
        {
            return TryGetString(user, name);
        }

        string? GetFromUserMetadata(string name)
        {
            if (user.TryGetProperty("user_metadata", out var meta) &&
                meta.ValueKind == JsonValueKind.Object)
                return TryGetString(meta, name);

            return null;
        }

        var auth0UserId = Get("user_id");
        var email =
            Get("email") ??
            GetFromUserMetadata("user_email");
        var displayName =
            Get("name") ??
            email;
        var pictureUrl = Get("picture");
        var createdAtStr = Get("created_at")!;
        if (!DateTime.TryParse(createdAtStr, null, DateTimeStyles.RoundtripKind, out var parsedDate))
            logger.LogWarning("Invalid created_at format, using fallback now: {createdAtStr}", createdAtStr);

        var signUpAt = parsedDate;

        if (string.IsNullOrWhiteSpace(auth0UserId) || string.IsNullOrWhiteSpace(email))
        {
            logger.LogError(
                "Invalid user payload: missing user_id or email. user_id: {Auth0UserId}, email: {Email}",
                auth0UserId, email);
            throw new ValidationException("user_id and email are required");
        }

        var now = DateTime.UtcNow;
        var existing = await db.AppUsers.SingleOrDefaultAsync(u => u.Auth0UserId == auth0UserId, ct);

        if (existing is null)
        {
            var row = new AppUser
            {
                Auth0UserId = auth0UserId,
                Email = email,
                DisplayName = displayName,
                PictureUrl = pictureUrl,
                SignUpAt = signUpAt,
                CreationAt = now,
                UpdatedAt = now
            };
            db.AppUsers.Add(row);
            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Created new AppUser (Id: {Id}, Auth0Id: {Auth0UserId})",
                row.Id, row.Auth0UserId);

            return new AddUserResult { Id = row.Id, Auth0UserId = row.Auth0UserId };
        }

        existing.Email = email;
        existing.DisplayName = displayName;
        existing.PictureUrl = pictureUrl;
        existing.UpdatedAt = now;

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "♻ Updated AppUser (Id: {Id}, Auth0Id: {Auth0UserId})",
            existing.Id, existing.Auth0UserId);

        return new AddUserResult { Id = existing.Id, Auth0UserId = existing.Auth0UserId };
    }
}