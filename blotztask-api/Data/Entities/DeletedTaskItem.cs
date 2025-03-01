using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace BlotzTask.Data.Entities
{
    public class DeletedTaskItem
    {
        [DatabaseGenerated(DatabaseGeneratedOption.None)] // Keep the original TaskItem ID
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateOnly DueDate { get; set; }
        public bool IsDone { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime DeletedAt { get; set; } // Track when it was deleted

        public string UserId { get; set; }
        [ForeignKey("UserId")]
        public User User { get; set; }

        public int LabelId { get; set; }
        [ForeignKey("LabelId")]
        public Label Label { get; set; }
    }
}
