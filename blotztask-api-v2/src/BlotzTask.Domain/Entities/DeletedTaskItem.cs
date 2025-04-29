using System.ComponentModel.DataAnnotations.Schema;

namespace BlotzTask.Domain.Entities
{
    public class DeletedTaskItem
    {
        [DatabaseGenerated(DatabaseGeneratedOption.None)] // Keep the original TaskItem ID
        public int Id { get; set; }

        public required string Title { get; set; }
        public string? Description { get; set; }
        public DateTimeOffset DueDate { get; set; }
        public bool IsDone { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime DeletedAt { get; set; } // Track when it was deleted

        public required int UserId { get; set; }
        [ForeignKey("UserId")] public required User User { get; set; }

        public int LabelId { get; set; }
        [ForeignKey("LabelId")] public required Label Label { get; set; }
    }
}