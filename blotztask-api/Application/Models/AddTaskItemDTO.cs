namespace BlotzTask.Models
{
    public class AddTaskItemDTO
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTimeOffset DueDate { get; set; }
        public int LabelId { get; set; }
    }
}