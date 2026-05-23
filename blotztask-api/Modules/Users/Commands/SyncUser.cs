using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Entities;
using BlotzTask.Modules.Pomodoro.Domain;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Services;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public sealed record SyncUserCommand(JsonElement User);

public sealed class SyncUserResult
{
    public required Guid Id { get; init; }
    public required string Auth0UserId { get; init; }
}

// Change file name
public class SyncUserCommandHandler(
    BlotzTaskDbContext db,
    ILogger<SyncUserCommandHandler> logger)
{
    public async Task<SyncUserResult> Handle(SyncUserCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Starting user sync at {Time}", DateTime.UtcNow);

        var user = command.User;

        var auth0UserId = GetFromUser(user, "user_id");
        var email =
            GetFromUser(user, "email") ??
            GetFromUserMetadata(user, "user_email");
        var displayName =
            GetFromUser(user, "name") ??
            email;
        var pictureUrl = GetFromUser(user, "picture");
        var createdAtStr = GetFromUser(user, "created_at")!;
        if (!DateTime.TryParse(createdAtStr, null, DateTimeStyles.RoundtripKind, out var parsedDate))
            logger.LogWarning("Invalid created_at format, using fallback now: {createdAtStr}", createdAtStr);

        var signUpAt = parsedDate;
        var preferredLanguage = GetPreferredLanguage(user);

        if (string.IsNullOrWhiteSpace(auth0UserId) || string.IsNullOrWhiteSpace(email))
        {
            logger.LogError(
                "Invalid user payload: missing user_id or email. user_id: {Auth0UserId}, email: {Email}",
                auth0UserId, email);
            throw new ValidationException("user_id and email are required");
        }

        var utcNow = DateTime.UtcNow;

        logger.LogInformation("Looking up existing AppUser for Auth0UserId: {Auth0UserId}", auth0UserId);

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
                CreationAt = utcNow,
                UpdatedAt = utcNow,
                LoginAt = utcNow,
                IsOnboarded = false
            };
            db.AppUsers.Add(row);
            await db.SaveChangesAsync(ct);

            var userPreference = new UserPreference
            {
                UserId = row.Id,
                PreferredLanguage = preferredLanguage
            };
            db.UserPreferences.Add(userPreference);

            var pomodoroSetting = new PomodoroSetting
            {
                UserId = row.Id,
                Timing = 25,
                Sound = null,
                IsCountdown = false
            };
            db.PomodoroSetting.Add(pomodoroSetting);

            var subscription = new UserSubscription
            {
                UserId = row.Id,
                PlanId = 1,
                CreatedAt = utcNow
            };
            db.UserSubscriptions.Add(subscription);

            await db.SaveChangesAsync(ct);

            // Seed default tasks for new user
            var utcNowWithOffset = DateTimeOffset.UtcNow;
            var defaultTasks = DefaultOnboardingData.BuildTasks(
                row.Id,
                utcNowWithOffset,
                preferredLanguage);
            db.TaskItems.AddRange(defaultTasks);
            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Seeded {Count} default tasks for new user (Id: {Id})",
                defaultTasks.Count, row.Id);

            // Seed default notes for new user
            var defaultNotes = DefaultOnboardingData.BuildNotes(
                row.Id,
                preferredLanguage);
            db.Notes.AddRange(defaultNotes);
            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Seeded {Count} default notes for new user (Id: {Id})",
                defaultNotes.Count, row.Id);

            logger.LogInformation(
                "Created new AppUser (Id: {Id}, Auth0Id: {Auth0UserId})",
                row.Id, row.Auth0UserId);

            return new SyncUserResult { Id = row.Id, Auth0UserId = row.Auth0UserId };
        }

        existing.LoginAt = utcNow;
        await db.SaveChangesAsync(ct);

        return new SyncUserResult { Id = existing.Id, Auth0UserId = existing.Auth0UserId };
    }

    private Language GetPreferredLanguage(JsonElement user)
    {
        var preferredLanguageValue = GetFromUser(user, "preferred_language");

        return preferredLanguageValue?.StartsWith("zh", StringComparison.OrdinalIgnoreCase) == true
            ? Language.Zh
            : Language.En;
    }


    private string? Get(JsonElement source, string name)
    {
        return source.TryGetProperty(name, out var el) && el.ValueKind != JsonValueKind.Null
            ? el.GetString()
            : null;
    }

    private string? GetFromUser(JsonElement user, string name)
    {
        return Get(user, name);
    }

    private string? GetFromUserMetadata(JsonElement user, string name)
    {
        if (user.TryGetProperty("user_metadata", out var meta) &&
            meta.ValueKind == JsonValueKind.Object)
            return Get(meta, name);

        return null;
    }
}
