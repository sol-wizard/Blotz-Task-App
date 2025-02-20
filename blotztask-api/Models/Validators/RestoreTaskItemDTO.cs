namespace BlotzTask.Models
{
    public class RestoreTaskItemDTO
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public DateOnly DueDate { get; set; }
        public bool IsDone { get; set; }
        public int LabelId { get; set; }
    }
}
