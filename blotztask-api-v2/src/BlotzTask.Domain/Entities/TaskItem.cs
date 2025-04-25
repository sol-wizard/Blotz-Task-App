using System.ComponentModel.DataAnnotations.Schema;

namespace BlotzTask.Domain.Entities
{
    public class TaskItem
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public required string Title { get; set; }
        public string? Description { get; set; }
        public DateTimeOffset DueDate { get; set; }
        public bool IsDone { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        //TODO: Enable once identity is setup
        // public string UserId { get; set; }
        // [ForeignKey("UserId")]
        // public User User { get; set; }
        public int LabelId { get; set; }
        [ForeignKey("LabelId")]
        public required Label Label { get; set; }
    }
}
