namespace BlotzTask.Models
{
    public class EditTaskItemDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTimeOffset DueDate { get; set; } 
        public bool IsDone { get; set; }
        public int LabelId { get; set; }
    }
}