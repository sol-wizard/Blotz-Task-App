using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class FindDeletedSavedItemsTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public async Task Handle_TaskAndNoteDeletedAfterSaving_ReturnsOnlyThoseItems()
    {
        // Arrange
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var seeder = new DataSeeder(db);
        var userId = await seeder.CreateUserAsync();
        var start = DateTimeOffset.UtcNow.AddDays(1);
        var keptTask = await seeder.CreateTaskAsync(userId, "Keep", start, start.AddHours(1));
        var deletedTask = await seeder.CreateTaskAsync(userId, "Delete", start, start.AddHours(1));
        var keptNote = new Note { UserId = userId, Text = "Keep", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var deletedNote = new Note { UserId = userId, Text = "Delete", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Notes.AddRange(keptNote, deletedNote);
        await db.SaveChangesAsync();
        var keptTaskItem = Item(taskId: keptTask.Id);
        var deletedTaskItem = Item(taskId: deletedTask.Id);
        var keptNoteItem = Note(keptNote.Id);
        var deletedNoteItem = Note(deletedNote.Id);
        // A saved recurring item points at its template, which never is a TaskItems row.
        var recurringItem = Item(taskId: int.MaxValue) with { PersistedSeriesId = 1,
            Recurrence = new(RecurrenceFrequency.Daily, 1, null, null, null) };
        var unsavedItem = Item(taskId: null);
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        draft.Replace([keptTaskItem, deletedTaskItem, keptNoteItem, deletedNoteItem, recurringItem, unsavedItem]);
        db.TaskItems.Remove(deletedTask);
        db.Notes.Remove(deletedNote);
        await db.SaveChangesAsync();

        // Act
        var deleted = await new FindDeletedSavedItemsQueryHandler(db).Handle(new() { UserId = userId, Drafts = [draft] });

        // Assert
        deleted.Should().BeEquivalentTo([deletedTaskItem.ProposalId, deletedNoteItem.ProposalId],
            because: "only saved one-off tasks and notes that are gone from the app count as deleted");
    }

    [Fact]
    public async Task Handle_DeletedSavedItem_IsMarkedInDraftsContext()
    {
        // Arrange
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()), NullLogger<ModelContextBuilder>.Instance);
        var deletedItem = Item(taskId: 1) with { Title = "Team meeting" };
        var keptItem = Item(taskId: 2);
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        draft.Replace([deletedItem, keptItem]);
        var request = new ModelTurnRequest(Guid.NewGuid(), [new GatewayUserMessage("Add it again")], [draft],
            "Australia/Perth", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true,
            DeletedSavedItemIds: new HashSet<Guid> { deletedItem.ProposalId });

        // Act
        var context = await builder.BuildAsync(request, [], _ => throw new InvalidOperationException("No summary expected."));

        // Assert
        var drafts = context.Transcript.OfType<GatewaySystemMessage>()
            .Single(message => message.Content.StartsWith(ModelContextBuilder.DraftContextPrefix, StringComparison.Ordinal));
        var lines = drafts.Content[ModelContextBuilder.DraftContextPrefix.Length..].Split('\n');
        using var json = System.Text.Json.JsonDocument.Parse(lines[0]);
        var view = json.RootElement[0];
        view.GetProperty("deletedSavedItems").EnumerateArray().Select(item => item.GetProperty("title").GetString())
            .Should().Equal(["Team meeting"], because: "a saved task deleted in the app is listed apart, not as saved");
        view.GetProperty("savedItems").EnumerateArray().Select(item => item.GetProperty("title").GetString())
            .Should().Equal(["Buy milk"], because: "items still in the app stay in the saved list");
        lines[1].Should().Be(ModelContextBuilder.DeletedItemsNote + $"Team meeting ({deletedItem.Date:yyyy-MM-dd} 10:00–10:30)",
            because: "the deleted task is also named in plain words, which a model is far less likely to miss");
    }

    private static TaskProposal Item(int? taskId) => new(Guid.NewGuid(), "Buy milk", null,
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)), new(10, 0), new(10, 30), "Australia/Perth", null, PersistedTaskId: taskId);

    private static TaskProposal Note(Guid noteId) => new(Guid.NewGuid(), "Book list", "Atomic Habits", null, null, null,
        "Australia/Perth", null, Kind: ProposalKind.Note, PersistedNoteId: noteId);
}
