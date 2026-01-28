using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
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
                IsOnboarded = false
            };
            db.AppUsers.Add(row);
            await db.SaveChangesAsync(ct);

            var userPreference = new UserPreference
            {
                UserId = row.Id
            };
            db.UserPreferences.Add(userPreference);
            await db.SaveChangesAsync(ct);

            // Seed default tasks for new user
            var utcNowWithOffset = DateTimeOffset.UtcNow;
            var singleTime = utcNowWithOffset;
            var rangeStart = utcNowWithOffset;
            var rangeEnd = utcNowWithOffset.AddHours(2);

            var defaultTasks = new List<TaskItem>
            {
                new TaskItem
                {
                    Title = "Welcome to Blotz!",
                    Description = "This is a single-time task example",
                    StartTime = singleTime,
                    EndTime = singleTime,
                    TimeType = TaskTimeType.SingleTime,
                    UserId = row.Id,
                    IsDone = false,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new TaskItem
                {
                    Title = "Explore the app",
                    Description = "This is a range-time task example",
                    StartTime = rangeStart,
                    EndTime = rangeEnd,
                    TimeType = TaskTimeType.RangeTime,
                    UserId = row.Id,
                    IsDone = false,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new TaskItem
                {
                    Title = "Plan your first task",
                    Description = "This is a floating task example",
                    StartTime = null,
                    EndTime = null,
                    TimeType = null,
                    UserId = row.Id,
                    IsDone = false,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                }
            };

            db.TaskItems.AddRange(defaultTasks);
            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Seeded {Count} default tasks for new user (Id: {Id})",
                defaultTasks.Count, row.Id);

            // Seed default notes for new user
            var defaultNotes = new List<Note>
            {
                new Note
                {
                    Text = "Welcome to BlotzTask! This is your first note.",
                    UserId = row.Id,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new Note
                {
                    Text = "You can use notes to capture quick thoughts and ideas.",
                    UserId = row.Id,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new Note
                {
                    Text = "Notes are perfect for things that don't need a due date.",
                    UserId = row.Id,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new Note
                {
                    Text = "Try creating your own note!",
                    UserId = row.Id,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                }
            };

            db.Notes.AddRange(defaultNotes);
            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Seeded {Count} default notes for new user (Id: {Id})",
                defaultNotes.Count, row.Id);

            logger.LogInformation(
                "Created new AppUser (Id: {Id}, Auth0Id: {Auth0UserId})",
                row.Id, row.Auth0UserId);

            return new AddUserResult { Id = row.Id, Auth0UserId = row.Auth0UserId };
        }

        existing.Email = email;
        existing.DisplayName = displayName;
        existing.PictureUrl = pictureUrl;
        existing.UpdatedAt = utcNow;

        logger.LogInformation(
            "Persisting updates to AppUser (Id: {Id}, Auth0Id: {Auth0UserId})",
            existing.Id, existing.Auth0UserId);

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "♻ Updated AppUser (Id: {Id}, Auth0Id: {Auth0UserId})",
            existing.Id, existing.Auth0UserId);

        return new AddUserResult { Id = existing.Id, Auth0UserId = existing.Auth0UserId };
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