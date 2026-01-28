using System.ComponentModel.DataAnnotations.Schema;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Users.Domain;


namespace BlotzTask.Modules.Notes.Domain;

public class Note
{
  public Guid Id { get; set; } = Guid.NewGuid();
  public string Text { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
  public Guid UserId { get; set; }
  public AppUser? User { get; set; }




}