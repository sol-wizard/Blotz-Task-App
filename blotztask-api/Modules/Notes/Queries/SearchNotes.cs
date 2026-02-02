using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Notes.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Notes.Queries;

public class SearchNotesQuery
{
  [Required] public required Guid UserId { get; set; }
  public string? QueryString { get; set; }

}
public class SearchNotesQueryHandler(BlotzTaskDbContext db, ILogger<SearchNotesQueryHandler> logger)
{
  public async Task<List<NoteDto>> Handle(SearchNotesQuery query, CancellationToken ct = default)
  {
    logger.LogInformation("Getting notes for user {UserId}.Query{query}", query.UserId, query.QueryString);
    var notes = db.Notes
        .AsNoTracking()
        .Where(n => n.UserId == query.UserId);
    if (!string.IsNullOrWhiteSpace(query.QueryString))
    {
      var q = query.QueryString.Trim();
      notes = notes.Where(n => n.Text.Contains(q));
    }
    return await notes.OrderByDescending(n => n.CreatedAt)
                      .Select(n => new NoteDto
                      {
                        Id = n.Id,
                        Text = n.Text,
                        CreatedAt = n.CreatedAt,
                        UpdatedAt = n.UpdatedAt
                      })
                      .ToListAsync(ct);

  }
}