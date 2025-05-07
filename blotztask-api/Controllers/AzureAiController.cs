using BlotzTask.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AzureAiController : ControllerBase
    {
        private readonly TaskGenerationAIService _aiService;

        public AzureAiController(TaskGenerationAIService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] PromptRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Prompt))
            {
                return BadRequest("Prompt cannot be empty.");
            }

            var response = await _aiService.GenerateResponseAsync(request.Prompt);
            return Ok(new { Response = response });
        }

        [HttpPost("generate-tasks-from-goal")]
        public async Task<IActionResult> GenerateTasksFromGoal([FromBody] GoalToTasksRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Goal) || request.DurationInDays <= 0)
            {
                return BadRequest("Goal and a valid duration are required.");
            }


            var response = await _aiService.GenerateTasksFromGoalAsync(request);

            return Ok( response );
        }

       

    }
}