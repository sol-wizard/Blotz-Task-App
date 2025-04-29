using System.ComponentModel.DataAnnotations.Schema;

namespace BlotzTask.Domain.Entities
{
    public class Label
    {
        public int LabelId { get; set; }

        public required string Name { get; set; }
        public required string Color { get; set; }
        public required string Description { get; set; }
        public ICollection<TaskItem> TaskItems { get; set; } = new List<TaskItem>();
    }
}