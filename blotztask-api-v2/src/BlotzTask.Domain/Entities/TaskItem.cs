using System.ComponentModel.DataAnnotations.Schema;

namespace BlotzTask.Domain.Entities
{
    public class TaskItem
    {
        public int Id { get; set; }

        public required string Title { get; set; }
        public string? Description { get; set; }
        public DateTimeOffset DueDate { get; set; }
        public bool IsDone { get; set; }
        public bool HasTime { get; set; } 
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public required int UserId { get; set; }
        [ForeignKey("UserId")] public User? User { get; set; }
        public int LabelId { get; set; }
        [ForeignKey("LabelId")] public Label? Label { get; set; }
    }
}