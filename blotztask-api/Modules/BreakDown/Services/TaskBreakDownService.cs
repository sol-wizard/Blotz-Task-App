
namespace BlotzTask.Modules.BreakDown.Services
{
    public interface ITaskBreakdownService
    {
        Task<List<SubTask>> BreakdownTaskAsync(TaskDetailsDto taskDetails, string conversationId);
        Task<List<SubTask>> ModifyBreakdownAsync(string userRequest, string conversationId);
    }

    public class TaskBreakdownService : ITaskBreakdownService
    {
        private readonly ILogger<TaskBreakdownService> _logger;

        public TaskBreakdownService(ILogger<TaskBreakdownService> logger)
        {
            _logger = logger;
        }

        public async Task<List<SubTask>> BreakdownTaskAsync(TaskDetailsDto taskDetails, string conversationId)
        {
            _logger.LogInformation("BreakdownTaskAsync called. ConversationId: {ConversationId}, TaskDetails: {@TaskDetails}", conversationId, taskDetails);
            // Temporary: Return a hardcoded list of subtasks for testing
            var subtasks = new List<SubTask>
            {
                new SubTask { Title = "Subtask 1", Duration = TimeSpan.FromHours(1) },
                new SubTask { Title = "Subtask 2", Duration = TimeSpan.FromHours(2) },
                new SubTask { Title = "Subtask 3", Duration = TimeSpan.FromMinutes(30) }
            };
            return subtasks;
        }

        public async Task<List<SubTask>> ModifyBreakdownAsync(string userRequest, string conversationId)
        {
            _logger.LogInformation("ModifyBreakdownAsync called. ConversationId: {ConversationId}, UserRequest: {UserRequest}", conversationId, userRequest);
            // Temporary: Return a hardcoded list of modified subtasks for testing
            var modifiedSubtasks = new List<SubTask>
            {
                new SubTask { Title = "Modified Subtask 1", Duration = TimeSpan.FromHours(1.5) },
                new SubTask { Title = "Modified Subtask 2", Duration = TimeSpan.FromHours(2.5) },
                new SubTask { Title = "Modified Subtask 3", Duration = TimeSpan.FromMinutes(45) }
            };
            return modifiedSubtasks;
        }
    }
}